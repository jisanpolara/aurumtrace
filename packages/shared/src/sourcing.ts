import { z } from "zod";
import { TenantId, Uuid } from "./ids";

export const DeclarationType = z.enum([
  "customer_owned",
  "dealer_sourced",
  "unknown",
]);
export type DeclarationType = z.infer<typeof DeclarationType>;

export const SourcingRisk = z.enum(["low", "medium", "high"]);
export type SourcingRisk = z.infer<typeof SourcingRisk>;

/** Responsible-sourcing record: OECD five-step checklist + risk rating. */
export const SourcingRecord = z.object({
  id: Uuid,
  tenantId: TenantId,
  caseId: Uuid,
  declarationType: DeclarationType.nullable(),
  /** Map of OECD step key -> completed. */
  oecdSteps: z.record(z.string(), z.boolean()),
  sourcingRisk: SourcingRisk.nullable(),
  createdAt: z.string().datetime(),
});
export type SourcingRecord = z.infer<typeof SourcingRecord>;
