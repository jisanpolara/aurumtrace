import { z } from "zod";
import { TenantId, UserId, Uuid } from "./ids";
import { Fils } from "./money";

export const ReportType = z.enum(["DPMSR", "STR"]);
export type ReportType = z.infer<typeof ReportType>;

/**
 * goAML report lifecycle. `filed` is only ever reached by an explicit human
 * "review & file" action (Step 8) — nothing transitions here automatically.
 */
export const ReportStatus = z.enum(["draft", "pending_review", "filed"]);
export type ReportStatus = z.infer<typeof ReportStatus>;

export const Report = z.object({
  id: Uuid,
  tenantId: TenantId,
  caseId: Uuid,
  reportType: ReportType,
  reference: z.string().nullable(),
  status: ReportStatus,
  valueFils: Fils.nullable(),
  narrative: z.string().nullable(),
  goamlXml: z.string().nullable(),
  filedAt: z.string().datetime().nullable(),
  filedBy: UserId.nullable(),
  createdAt: z.string().datetime(),
});
export type Report = z.infer<typeof Report>;
