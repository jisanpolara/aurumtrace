import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Principal } from "@aurumtrace/shared";
import type { LlmAdapter } from "@aurumtrace/integrations";
import { TENANT_DATABASE, type TenantDatabase } from "../common/db/tenant-database";
import { LLM } from "../common/integrations/integrations.module";
import { AuditService } from "../audit/audit.service";
import {
  buildGoamlDraft,
  buildNarrativePrompt,
  type DraftValidation,
  validateGoamlDraft,
} from "./goaml-builder";

/** Roles permitted to file a report to the FIU (counter staff / auditor cannot). */
const FILING_ROLES = new Set(["owner", "compliance_officer"]);

export type ReportListRow = {
  id: string;
  reference: string | null;
  reportType: string;
  status: string;
  valueFils: number | null;
  customer: string | null;
};

export type ReportDraft = {
  id: string;
  reference: string;
  status: string;
  valueFils: number;
  xml: string;
  narrative: string;
  validation: DraftValidation;
  provisional: boolean;
};

@Injectable()
export class ReportService {
  constructor(
    @Inject(TENANT_DATABASE) private readonly db: TenantDatabase,
    @Inject(LLM) private readonly llm: LlmAdapter,
    private readonly audit: AuditService,
  ) {}

  /**
   * Draft (or re-draft) a goAML DPMSR report for a case. Produces a PROVISIONAL
   * XML draft + an LLM-drafted, PII-free narrative, validates structurally, and
   * stores it as `pending_review`. It NEVER files — that is a separate explicit
   * human action (`file`). Status never reaches 'filed' here.
   */
  async draft(principal: Principal, caseId: string): Promise<ReportDraft> {
    // 1. Load facts (PII used only to build the report's party block, server-side).
    const facts = await this.db.withTenant(principal, async (q) => {
      const c = await q.query<{
        reference: string;
        status: string;
        aggregate_value_fils: string | null;
        legal_name: string;
        licence_no: string;
        goaml_org_id: string | null;
        customer_name: string | null;
        emirates_id: string | null;
        risk_rating: string | null;
        created_at: string | Date;
      }>(
        `select c.reference, c.status, c.aggregate_value_fils,
                t.legal_name, t.licence_no, t.goaml_org_id,
                cu.full_name as customer_name, cu.emirates_id, cu.risk_rating,
                c.created_at
           from public.cases c
           join public.tenants t on t.id = c.tenant_id
           left join public.customers cu on cu.id = c.customer_id and cu.tenant_id = c.tenant_id
          where c.id = $1`,
        [caseId],
      );
      if (!c.rows[0]) throw new NotFoundException("case not found");
      const item = await q.query<{
        item_type: string;
        purity_karat: number | null;
        weight_grams: string;
        value_fils: string;
      }>(
        `select item_type, purity_karat, weight_grams, value_fils
           from public.items where case_id = $1 order by created_at asc limit 1`,
        [caseId],
      );
      return { c: c.rows[0]!, item: item.rows[0] };
    });

    const date = (
      facts.c.created_at instanceof Date
        ? facts.c.created_at.toISOString()
        : String(facts.c.created_at)
    ).slice(0, 10);
    const valueFils = Number(facts.item?.value_fils ?? 0);
    const aggregateFils = facts.c.aggregate_value_fils
      ? Number(facts.c.aggregate_value_fils)
      : valueFils;
    const reportable = facts.c.status === "reportable";

    // 2. Build the PROVISIONAL goAML draft (party block carries name/ID — the
    //    report's lawful purpose).
    const draft = buildGoamlDraft({
      reference: facts.c.reference,
      reportingEntity: {
        legalName: facts.c.legal_name,
        licence: facts.c.licence_no,
        goamlOrgId: facts.c.goaml_org_id,
      },
      transaction: {
        date,
        itemType: facts.item?.item_type ?? "unknown",
        purityKarat: facts.item?.purity_karat ?? null,
        weightGrams: Number(facts.item?.weight_grams ?? 0),
        valueFils,
        aggregateFils,
        reportable,
      },
      party: {
        name: facts.c.customer_name ?? "Unknown",
        idNumber: facts.c.emirates_id,
        riskBand: facts.c.risk_rating,
      },
    });
    const validation = validateGoamlDraft(draft.xml);

    // 3. LLM-drafted narrative — PII-free by construction (prompt takes no
    //    name/ID), so the guard passes. Human reviews before filing.
    const narrativePrompt = buildNarrativePrompt({
      date,
      itemType: facts.item?.item_type ?? "item",
      purityKarat: facts.item?.purity_karat ?? null,
      weightGrams: Number(facts.item?.weight_grams ?? 0),
      valueFils,
      aggregateFils,
      reportable,
      riskBand: facts.c.risk_rating,
    });
    const narrative = (await this.llm.complete({ prompt: narrativePrompt, dataHandling: "no_pii" }))
      .text;

    // 4. Store as pending_review + audit (no PII in payload). Never 'filed'.
    return this.db.withTenant(principal, async (q) => {
      const row = await q.query<{ id: string; status: string }>(
        `insert into public.reports
           (tenant_id, case_id, report_type, reference, status, value_fils, narrative, goaml_xml)
         values ($1,$2,'DPMSR',$3,'pending_review',$4,$5,$6)
         on conflict (tenant_id, reference) do update
           set status='pending_review', value_fils=excluded.value_fils,
               narrative=excluded.narrative, goaml_xml=excluded.goaml_xml
           where public.reports.status <> 'filed'
         returning id, status`,
        [principal.tenantId, caseId, facts.c.reference, valueFils, narrative, draft.xml],
      );
      // No row => the existing report is already 'filed'; never silently re-open it.
      if (!row.rows[0]) {
        throw new ConflictException("cannot re-draft a report that has already been filed");
      }
      await this.audit.appendWithin(q, principal, {
        tenantId: principal.tenantId,
        actorId: principal.userId,
        event: "report.drafted",
        caseId,
        resourceType: "report",
        resourceId: row.rows[0]!.id,
        payload: {
          reportType: "DPMSR",
          reference: facts.c.reference,
          valueFils,
          aggregateFils,
          provisional: draft.provisional,
          schemaValid: validation.valid,
        },
      });
      return {
        id: row.rows[0]!.id,
        reference: facts.c.reference,
        status: row.rows[0]!.status,
        valueFils,
        xml: draft.xml,
        narrative,
        validation,
        provisional: draft.provisional,
      };
    });
  }

  /** Reports for the active tenant (RLS-scoped), newest first. */
  async list(principal: Principal): Promise<ReportListRow[]> {
    return this.db.withTenant(principal, async (q) => {
      const res = await q.query<{
        id: string;
        reference: string | null;
        report_type: string;
        status: string;
        value_fils: string | null;
        customer: string | null;
      }>(
        `select r.id, r.reference, r.report_type, r.status, r.value_fils,
                cu.full_name as customer
           from public.reports r
           left join public.cases c on c.id = r.case_id and c.tenant_id = r.tenant_id
           left join public.customers cu on cu.id = c.customer_id and cu.tenant_id = r.tenant_id
          order by r.created_at desc`,
      );
      return res.rows.map((r) => ({
        id: r.id,
        reference: r.reference,
        reportType: r.report_type,
        status: r.status,
        valueFils: r.value_fils == null ? null : Number(r.value_fils),
        customer: r.customer,
      }));
    });
  }

  /**
   * The ONLY path that marks a report filed — an explicit human action after
   * review. It records the decision; the actual submission to the FIU goAML
   * portal is a manual, out-of-band upload. Nothing here auto-submits.
   */
  async file(
    principal: Principal,
    reportId: string,
  ): Promise<{ id: string; status: string; filedAt: string }> {
    // Filing authority: counter staff and auditors must not file FIU reports.
    if (!FILING_ROLES.has(principal.role)) {
      throw new ForbiddenException("your role may not file reports");
    }
    return this.db.withTenant(principal, async (q) => {
      const upd = await q.query<{
        id: string;
        status: string;
        filed_at: string | Date;
        case_id: string;
      }>(
        `update public.reports
            set status = 'filed', filed_at = now(), filed_by = $2
          where id = $1 and status <> 'filed'
          returning id, status, filed_at, case_id`,
        [reportId, principal.userId],
      );
      if (!upd.rows[0]) throw new NotFoundException("report not found or already filed");
      await this.audit.appendWithin(q, principal, {
        tenantId: principal.tenantId,
        actorId: principal.userId,
        event: "report.filed",
        caseId: upd.rows[0]!.case_id,
        resourceType: "report",
        resourceId: reportId,
        payload: { filedBy: principal.userId },
      });
      const filedAt = upd.rows[0]!.filed_at;
      return {
        id: upd.rows[0]!.id,
        status: upd.rows[0]!.status,
        filedAt: filedAt instanceof Date ? filedAt.toISOString() : String(filedAt),
      };
    });
  }
}
