import { SetMetadata } from "@nestjs/common";
import type { Role } from "@aurumtrace/shared";

export const ROLES_KEY = "at_roles";

/**
 * Restrict a route (or controller) to the given tenant roles. Enforced by
 * RolesGuard, which must run after AuthGuard. With no decorator, any
 * authenticated role may call the route (e.g. read-only GETs open to auditors).
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
