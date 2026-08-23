import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Role } from "@aurumtrace/shared";
import { ROLES_KEY } from "./roles.decorator";
import type { RequestWithPrincipal } from "../principal";

/**
 * Enforces `@Roles(...)` metadata against the authenticated principal's role.
 * Use with AuthGuard (which resolves the principal) and list it AFTER it:
 * `@UseGuards(AuthGuard, RolesGuard)`. Routes with no `@Roles` are open to any
 * authenticated role. This is defence-in-depth on top of RLS (the DB never
 * exposes another tenant's data regardless of role).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<RequestWithPrincipal>();
    const role = req.principal?.role;
    if (!role || !roles.includes(role)) {
      throw new ForbiddenException("Your role is not permitted to perform this action");
    }
    return true;
  }
}
