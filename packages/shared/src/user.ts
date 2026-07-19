import { z } from "zod";
import { TenantId, UserId } from "./ids";
import { Role } from "./tenant";

/** A user identity (mirrors Supabase auth.users). */
export const User = z.object({
  id: UserId,
  email: z.string().email(),
  displayName: z.string().min(1),
});
export type User = z.infer<typeof User>;

/** A user's membership of a tenant, with their role there. */
export const Membership = z.object({
  userId: UserId,
  tenantId: TenantId,
  role: Role,
});
export type Membership = z.infer<typeof Membership>;

/**
 * The per-request principal resolved from the verified JWT + membership.
 * This is the single source of the active `tenantId` used to scope every query.
 */
export const Principal = z.object({
  userId: UserId,
  tenantId: TenantId,
  role: Role,
});
export type Principal = z.infer<typeof Principal>;
