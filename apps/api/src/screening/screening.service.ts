import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Principal } from "@aurumtrace/shared";
import type { ScreeningAdapter, ScreeningOutcome } from "@aurumtrace/integrations";
import { TENANT_DATABASE, type TenantDatabase } from "../common/db/tenant-database";
import { SCREENING } from "../common/integrations/integrations.module";
import { AuditService } from "../audit/audit.service";
import { scoreRisk, type RiskResult } from "./risk-engine";

export type ScreeningRunResult = { screening: ScreeningOutcome; risk: RiskResult };

@Injectable()
export class ScreeningService {
  constructor(
    @Inject(TENANT_DATABASE) private readonly db: TenantDatabase,
    @Inject(SCREENING) private readonly screening: ScreeningAdapter,
    private readonly audit: AuditService,
  ) {}

  async run(principal: Principal, caseId: string): Promise<ScreeningRunResult> {
    // 1. Load case + customer facts (PII stays server-side, never logged).
    const facts = await this.db.withTenant(principal, async (q) => {
      const c = await q.query<{
        id: string;
        customer_id: string | null;
        status: string;
      }>(`select id, customer_id, status from public.cases where id = $1`, [caseId]);
      const kase = c.rows[0];
      if (!kase) throw new NotFoundException("case not found");
      if (!kase.customer_id) throw new NotFoundException("case has no customer");

      const cust = await q.query<{
        full_name: string;
        date_of_birth: string | null;
        nationality: string | null;
        residency_status: "resident" | "non_resident" | null;
        created_at: string | Date;
      }>(
        `select full_name, date_of_birth, nationality, residency_status, created_at
           from public.customers where id = $1`,
        [kase.customer_id],
      );
      const linked = await q.query<{ n: number }>(
        `select count(*)::int as n from public.cases where customer_id = $1`,
        [kase.customer_id],
      );
      if (!cust.rows[0]) throw new NotFoundException("customer not found");
      return { kase, customer: cust.rows[0], linkedCount: linked.rows[0]?.n ?? 1 };
    });

    // 2. Run the screening provider (authorised KYC PII flow), outside the txn.
    const outcome = await this.screening.screen({
      fullName: facts.customer.full_name,
      dateOfBirth: facts.customer.date_of_birth,
      nationality: facts.customer.nationality,
    });

    // 3. Score risk (pure).
    const createdAt = new Date(facts.customer.created_at as string | number | Date);
    const tenureMonths = Math.max(
      0,
      Math.floor((Date.now() - createdAt.getTime()) / (30 * 24 * 60 * 60 * 1000)),
    );
    const risk = scoreRisk({
      screening: {
        sanctionsMatch: outcome.sanctionsMatch,
        pepMatch: outcome.pepMatch,
        adverseMedia: outcome.adverseMedia,
        identityVerified: outcome.identityVerified,
      },
      reportable: facts.kase.status === "reportable",
      linkedCount: facts.linkedCount,
      residency: facts.customer.residency_status,
      customerTenureMonths: tenureMonths,
    });

    // 4. Persist results + customer risk + audit, atomically.
    await this.db.withTenant(principal, async (q) => {
      await q.query(
        `insert into public.screening_results
           (tenant_id, case_id, customer_id, sanctions_match, pep_match, adverse_media,
            identity_verified, risk_score, risk_band, reasons)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          principal.tenantId,
          facts.kase.id,
          facts.kase.customer_id,
          outcome.sanctionsMatch,
          outcome.pepMatch,
          outcome.adverseMedia,
          outcome.identityVerified,
          risk.score,
          risk.band,
          JSON.stringify(risk.factors),
        ],
      );
      await q.query(`update public.customers set risk_rating = $1 where id = $2`, [
        risk.band,
        facts.kase.customer_id,
      ]);
      await q.query(
        `update public.cases set stage = greatest(stage, 2), updated_at = now() where id = $1`,
        [facts.kase.id],
      );

      // Audit — booleans/scores only, never names or Emirates ID.
      await this.audit.appendWithin(q, principal, {
        tenantId: principal.tenantId,
        actorId: null, // AI/system screening
        event: "screening.run",
        caseId: facts.kase.id,
        resourceType: "case",
        resourceId: facts.kase.id,
        payload: {
          sanctionsMatch: outcome.sanctionsMatch,
          pepMatch: outcome.pepMatch,
          adverseMedia: outcome.adverseMedia,
          identityVerified: outcome.identityVerified,
          source: outcome.source,
        },
      });
      await this.audit.appendWithin(q, principal, {
        tenantId: principal.tenantId,
        actorId: principal.userId,
        event: "risk.scored",
        caseId: facts.kase.id,
        resourceType: "case",
        resourceId: facts.kase.id,
        payload: {
          score: risk.score,
          band: risk.band,
          forcedHigh: risk.forcedHigh,
          provisional: risk.provisional,
          factors: risk.factors.map((f) => f.code),
        },
      });
    });

    return { screening: outcome, risk };
  }
}
