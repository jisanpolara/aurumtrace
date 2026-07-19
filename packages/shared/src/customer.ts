import { z } from "zod";
import { TenantId, Uuid } from "./ids";

export const RiskRating = z.enum(["unrated", "low", "medium", "high"]);
export type RiskRating = z.infer<typeof RiskRating>;

export const ResidencyStatus = z.enum(["resident", "non_resident"]);
export type ResidencyStatus = z.infer<typeof ResidencyStatus>;

/** A customer record. Identity fields are PII — RLS-protected, never logged. */
export const Customer = z.object({
  id: Uuid,
  tenantId: TenantId,
  fullName: z.string().min(1),
  emiratesId: z.string().nullable(),
  nationality: z.string().nullable(),
  residencyStatus: ResidencyStatus.nullable(),
  dateOfBirth: z.string().date().nullable(),
  idExpiry: z.string().date().nullable(),
  riskRating: RiskRating,
  createdAt: z.string().datetime(),
});
export type Customer = z.infer<typeof Customer>;
