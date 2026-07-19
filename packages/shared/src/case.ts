import { z } from "zod";
import { TenantId, UserId, Uuid } from "./ids";
import { Fils } from "./money";

export const CaseStage = z.number().int().min(1).max(6);
export type CaseStage = z.infer<typeof CaseStage>;

export const CaseStatus = z.enum([
  "draft",
  "in_review",
  "reportable",
  "cleared",
  "filed",
]);
export type CaseStatus = z.infer<typeof CaseStatus>;

/** A compliance case moving through the six-stage flow. */
export const Case = z.object({
  id: Uuid,
  tenantId: TenantId,
  reference: z.string().min(1),
  customerId: Uuid.nullable(),
  stage: CaseStage,
  status: CaseStatus,
  aggregateValueFils: Fils.nullable(),
  createdBy: UserId.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Case = z.infer<typeof Case>;
