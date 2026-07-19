import { z } from "zod";
import { TenantId } from "./ids";

/** A dealer entity (one tenant). Every domain row is scoped to a tenant. */
export const Tenant = z.object({
  id: TenantId,
  legalName: z.string().min(1),
  /** Trade-licence authority badge, e.g. "DMCC". */
  licenceAuthority: z.string().min(1),
  licenceNo: z.string().min(1),
  goamlOrgId: z.string().min(1).nullable(),
  createdAt: z.string().datetime(),
});
export type Tenant = z.infer<typeof Tenant>;

/** Roles within a tenant. Auditor is read-only; staff do counter intake. */
export const Role = z.enum(["owner", "compliance_officer", "staff", "auditor"]);
export type Role = z.infer<typeof Role>;
