import {
  CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { jwtVerify } from "jose";
import { Principal } from "@aurumtrace/shared";
import { loadEnv } from "../../config/env";
import type { RequestWithPrincipal } from "../principal";

/**
 * Resolves the request Principal from a verified Supabase access token.
 *
 * The active tenant + role are read from JWT claims (`tenant_id`, `role`),
 * provisioned at login from the user's membership (Supabase app_metadata /
 * auth hook). Trusting the *verified* claim means the same value flows into
 * `request.jwt.claims` for RLS — no unscoped bootstrap query is needed.
 *
 * In AUTH_DEV_MODE only, `x-debug-*` headers stand in for a token (local dev).
 * In DEMO_MODE only (hosted open demo), every request resolves to one fixed
 * demo tenant — no token required. RLS still scopes all data to that tenant.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithPrincipal>();
    const env = loadEnv();

    let principal: Principal | null;
    if (env.DEMO_MODE) {
      principal = this.demoPrincipal(env);
    } else if (env.AUTH_DEV_MODE) {
      principal = this.fromDebugHeaders(req);
    } else {
      principal = await this.fromBearer(req, env.SUPABASE_JWT_SECRET);
    }

    if (!principal) throw new UnauthorizedException();
    req.principal = principal;
    return true;
  }

  private demoPrincipal(env: ReturnType<typeof loadEnv>): Principal | null {
    const parsed = Principal.safeParse({
      userId: env.DEMO_USER_ID,
      tenantId: env.DEMO_TENANT_ID,
      role: env.DEMO_ROLE,
    });
    return parsed.success ? parsed.data : null;
  }

  private fromDebugHeaders(req: RequestWithPrincipal): Principal | null {
    const parsed = Principal.safeParse({
      userId: header(req, "x-debug-user"),
      tenantId: header(req, "x-debug-tenant"),
      role: header(req, "x-debug-role"),
    });
    return parsed.success ? parsed.data : null;
  }

  private async fromBearer(
    req: RequestWithPrincipal,
    secret: string,
  ): Promise<Principal | null> {
    const auth = header(req, "authorization");
    if (!auth?.startsWith("Bearer ")) return null;
    try {
      const { payload } = await jwtVerify(
        auth.slice("Bearer ".length),
        new TextEncoder().encode(secret),
        // Pin the algorithm — never let a token select a weaker/unexpected alg.
        { algorithms: ["HS256"] },
      );
      const parsed = Principal.safeParse({
        userId: payload.sub,
        tenantId: payload["tenant_id"],
        role: payload["role"],
      });
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }
}

function header(req: RequestWithPrincipal, name: string): string | undefined {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
}
