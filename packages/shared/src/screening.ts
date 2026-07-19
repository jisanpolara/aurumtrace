import { z } from "zod";
import { TenantId, Uuid } from "./ids";

export const RiskBand = z.enum(["low", "medium", "high"]);
export type RiskBand = z.infer<typeof RiskBand>;

/** Outcome of a KYC/CDD screening run for a case. */
export const ScreeningResult = z.object({
  id: Uuid,
  tenantId: TenantId,
  caseId: Uuid,
  customerId: Uuid.nullable(),
  runAt: z.string().datetime(),
  sanctionsMatch: z.boolean(),
  pepMatch: z.boolean(),
  adverseMedia: z.boolean(),
  identityVerified: z.boolean(),
  riskScore: z.number().int().min(0).max(100).nullable(),
  riskBand: RiskBand.nullable(),
  reasons: z.array(z.string()),
});
export type ScreeningResult = z.infer<typeof ScreeningResult>;
