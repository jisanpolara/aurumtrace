import { Inject, Injectable } from "@nestjs/common";
import { fils, type Principal } from "@aurumtrace/shared";
import type { GoldPriceAdapter, OcrAdapter } from "@aurumtrace/integrations";
import { TENANT_DATABASE, type TenantDatabase } from "../common/db/tenant-database";
import { GOLD_PRICE, OCR } from "../common/integrations/integrations.module";
import { AuditService } from "../audit/audit.service";
import type { CreateCaseRequest } from "./dto";

export type IntakeResult = {
  case: { id: string; reference: string; stage: number; status: string };
  customer: { id: string; fullName: string };
  item: { id: string; valueFils: number };
  valuation: { filsPerGram: number; purityKarat: number; asOf: string; source: string };
};

/**
 * Module 1 — Intake. The first real vertical slice: OCR-extract the customer
 * from a scanned ID, value the gold item against the live gold price, create the
 * case + item, and write the audit trail — all in one tenant-scoped transaction.
 */
@Injectable()
export class IntakeService {
  constructor(
    @Inject(TENANT_DATABASE) private readonly db: TenantDatabase,
    @Inject(GOLD_PRICE) private readonly goldPrice: GoldPriceAdapter,
    @Inject(OCR) private readonly ocr: OcrAdapter,
    private readonly audit: AuditService,
  ) {}

  async createCase(principal: Principal, req: CreateCaseRequest): Promise<IntakeResult> {
    // 1. Extract identity from the scan (PII — stays server-side, never logged).
    const id = await this.ocr.extractIdDocument({ imageRef: req.idImageRef });

    // 2. Value the item against the live (or mocked) gold price, in fils.
    const price = await this.goldPrice.getPricePerGram({ purityKarat: req.item.purityKarat });
    const valueFils = fils(Math.round(req.item.weightGrams * price.filsPerGram));

    // 3. Persist everything + audit atomically, under tenant RLS.
    return this.db.withTenant(principal, async (q) => {
      // Serialize per-tenant so the case reference sequence is race-free.
      await q.query("select pg_advisory_xact_lock(hashtext($1))", [
        `${principal.tenantId}:case`,
      ]);

      const customer = await q.query<{ id: string; full_name: string }>(
        `insert into public.customers
           (tenant_id, full_name, emirates_id, nationality, residency_status, date_of_birth, id_expiry)
         values ($1,$2,$3,$4,'resident',$5,$6)
         on conflict (tenant_id, emirates_id)
           do update set full_name = excluded.full_name
         returning id, full_name`,
        [
          principal.tenantId,
          id.fullName,
          id.idNumber,
          id.nationality,
          id.dateOfBirth,
          id.idExpiry,
        ],
      );
      const customerId = customer.rows[0]!.id;

      const count = await q.query<{ n: number }>(
        `select count(*)::int as n from public.cases where tenant_id = $1`,
        [principal.tenantId],
      );
      const reference = `AT-${new Date().getFullYear()}-${String(count.rows[0]!.n + 1).padStart(6, "0")}`;

      const caseRow = await q.query<{ id: string; reference: string; stage: number; status: string }>(
        `insert into public.cases (tenant_id, reference, customer_id, stage, status, created_by, occurred_at)
         values ($1,$2,$3,1,'draft',$4,$5)
         returning id, reference, stage, status`,
        [
          principal.tenantId,
          reference,
          customerId,
          principal.userId,
          req.occurredAt ?? new Date().toISOString(),
        ],
      );
      const caseId = caseRow.rows[0]!.id;

      const itemRow = await q.query<{ id: string; value_fils: string }>(
        `insert into public.items
           (tenant_id, case_id, item_type, purity_karat, weight_grams,
            transaction_type, gold_price_fils_per_gram, value_fils)
         values ($1,$2,$3,$4,$5,$6,$7,$8)
         returning id, value_fils`,
        [
          principal.tenantId,
          caseId,
          req.item.itemType,
          req.item.purityKarat,
          req.item.weightGrams,
          req.item.transactionType,
          price.filsPerGram,
          valueFils,
        ],
      );

      // Audit (same transaction → atomic with the state change). Payloads carry
      // ids/amounts only — no PII.
      await this.audit.appendWithin(q, principal, {
        tenantId: principal.tenantId,
        actorId: principal.userId,
        event: "case.created",
        caseId,
        resourceType: "case",
        resourceId: caseId,
        payload: { reference, valueFils, purityKarat: req.item.purityKarat },
      });
      await this.audit.appendWithin(q, principal, {
        tenantId: principal.tenantId,
        actorId: null, // AI/system event
        event: "intake.id_scanned",
        caseId,
        resourceType: "customer",
        resourceId: customerId,
        payload: { confidence: id.confidence, documentType: id.documentType },
      });

      return {
        case: caseRow.rows[0]!,
        customer: { id: customerId, fullName: customer.rows[0]!.full_name },
        item: { id: itemRow.rows[0]!.id, valueFils: Number(itemRow.rows[0]!.value_fils) },
        valuation: {
          filsPerGram: price.filsPerGram,
          purityKarat: price.purityKarat,
          asOf: price.asOf,
          source: price.source,
        },
      };
    });
  }
}
