import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import type { Principal } from "@aurumtrace/shared";
import { TENANT_DATABASE, type TenantDatabase } from "../common/db/tenant-database";
import { AuditService } from "../audit/audit.service";
import { assessSourcingRisk, type SourcingResult } from "./sourcing-risk";

export const SourcingRequest = z.object({
  declarationType: z.enum(["customer_owned", "dealer_sourced", "unknown"]),
  steps: z.object({
    managementSystems: z.boolean(),
    riskAssessment: z.boolean(),
    riskStrategy: z.boolean(),
    audit: z.boolean(),
    reporting: z.boolean(),
  }),
});
export type SourcingRequest = z.infer<typeof SourcingRequest>;

@Injectable()
export class SourcingService {
  constructor(
    @Inject(TENANT_DATABASE) private readonly db: TenantDatabase,
    private readonly audit: AuditService,
  ) {}

  async submit(
    principal: Principal,
    caseId: string,
    req: SourcingRequest,
  ): Promise<SourcingResult> {
    const result = assessSourcingRisk(req);

    return this.db.withTenant(principal, async (q) => {
      const found = await q.query<{ id: string }>(
        `select id from public.cases where id = $1`,
        [caseId],
      );
      if (!found.rows[0]) throw new NotFoundException("case not found");

      await q.query(
        `insert into public.sourcing_records
           (tenant_id, case_id, declaration_type, oecd_steps, sourcing_risk)
         values ($1,$2,$3,$4,$5)`,
        [principal.tenantId, caseId, req.declarationType, JSON.stringify(req.steps), result.risk],
      );
      await q.query(
        `update public.cases set stage = greatest(stage, 4), updated_at = now() where id = $1`,
        [caseId],
      );
      await this.audit.appendWithin(q, principal, {
        tenantId: principal.tenantId,
        actorId: principal.userId,
        event: "sourcing.completed",
        caseId,
        resourceType: "case",
        resourceId: caseId,
        payload: {
          declarationType: req.declarationType,
          completedSteps: result.completedSteps,
          sourcingRisk: result.risk,
          provisional: result.provisional,
        },
      });
      return result;
    });
  }
}
