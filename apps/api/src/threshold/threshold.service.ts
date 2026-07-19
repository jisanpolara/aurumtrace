import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Principal } from "@aurumtrace/shared";
import { TENANT_DATABASE, type TenantDatabase } from "../common/db/tenant-database";
import { AuditService } from "../audit/audit.service";
import {
  assessReportability,
  type LinkedTransaction,
  type ReportabilityResult,
} from "./threshold-engine";
import { loadThresholdPolicy } from "./threshold-policy";

@Injectable()
export class ThresholdService {
  constructor(
    @Inject(TENANT_DATABASE) private readonly db: TenantDatabase,
    private readonly audit: AuditService,
  ) {}

  /**
   * Run the reporting-threshold determination for a case: aggregate the
   * customer's linked transactions within the policy window, decide
   * reportability, persist it on the case, and write a `threshold.checked`
   * audit entry — all atomically, under tenant RLS.
   */
  async check(principal: Principal, caseId: string): Promise<ReportabilityResult> {
    const policy = loadThresholdPolicy();

    return this.db.withTenant(principal, async (q) => {
      const cur = await q.query<{ id: string; customer_id: string | null; occurred_at: string | Date }>(
        `select c.id, c.customer_id, c.occurred_at from public.cases c where c.id = $1`,
        [caseId],
      );
      const current = cur.rows[0];
      if (!current) throw new NotFoundException("case not found");

      const curVal = await q.query<{ value_fils: string }>(
        `select coalesce(sum(value_fils), 0)::bigint as value_fils
           from public.items where case_id = $1`,
        [caseId],
      );

      // Window anchors on the transaction-occurrence date (cases.occurred_at),
      // set at intake (defaults to intake time). TODO(compliance): confirm with
      // the advisor that occurred_at is the correct anchor for aggregation.
      const currentTx: LinkedTransaction = {
        caseId: current.id,
        valueFils: Number(curVal.rows[0]?.value_fils ?? 0),
        occurredAt:
          current.occurred_at instanceof Date
            ? current.occurred_at.toISOString()
            : String(current.occurred_at),
      };

      // Prior transactions for the same customer (RLS keeps this tenant-scoped).
      let priorLinked: LinkedTransaction[] = [];
      if (current.customer_id) {
        const priors = await q.query<{ id: string; occurred_at: string | Date; value_fils: string }>(
          `select c.id, c.occurred_at,
                  coalesce(sum(i.value_fils), 0)::bigint as value_fils
             from public.cases c
             left join public.items i
               on i.case_id = c.id and i.tenant_id = c.tenant_id
            where c.customer_id = $1 and c.id <> $2
            group by c.id, c.occurred_at`,
          [current.customer_id, caseId],
        );
        priorLinked = priors.rows.map((r) => ({
          caseId: r.id,
          valueFils: Number(r.value_fils),
          occurredAt:
            r.occurred_at instanceof Date ? r.occurred_at.toISOString() : String(r.occurred_at),
        }));
      }

      const result = assessReportability({ current: currentTx, priorLinked, policy });

      await q.query(
        `update public.cases
            set aggregate_value_fils = $1,
                status = $2,
                stage = greatest(stage, 3),
                updated_at = now()
          where id = $3`,
        [result.aggregateFils, result.reportable ? "reportable" : "in_review", caseId],
      );

      // Audit the determination (payload is non-PII: ids + amounts + decision).
      await this.audit.appendWithin(q, principal, {
        tenantId: principal.tenantId,
        actorId: principal.userId,
        event: "threshold.checked",
        caseId,
        resourceType: "case",
        resourceId: caseId,
        payload: {
          aggregateFils: result.aggregateFils,
          thresholdFils: result.thresholdFils,
          windowDays: result.windowDays,
          reportable: result.reportable,
          linkedCount: result.linkedCaseIds.length,
          provisional: result.provisional,
          policySource: policy.source,
        },
      });

      return result;
    });
  }
}
