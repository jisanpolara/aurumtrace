import {
  CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { jwtVerify, createRemoteJWKSet, type JWTPayload } from "jose";
import { Principal } from "@aurumtrace/shared";
import { loadEnv, type Env } from "../../config/env";
import type { RequestWithPrincipal } from "../principal";

/** Cached remote JWKS (recreated only if the configured URL changes). */
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | undefined;
let cachedJwksUrl: string | undefined;
function jwksFor(url: string): ReturnType<typeof createRemoteJWKSet> {
  if (!cachedJwks || cachedJwksUrl !== url) {
    cachedJwks = createRemoteJWKSet(new URL(url));
    cachedJwksUrl = url;
  }
  return cachedJwks;
}

/**
 * Resolve the Principal from verified JWT claims. Our tenant + role ride in the
 * custom claims `tenant_id` and `app_role` (injected by the Supabase custom
 * access-token hook — see migration 0008). We deliberately do NOT read the
 * top-level `role` claim: Supabase reserves it for the Postgres role
 * (`authenticated`), so overloading it would break PostgREST/RLS.
 */
function principalFromClaims(payload: JWTPayload): Principal | null {
  const meta = (payload["app_metadata"] ?? {}) as Record<string, unknown>;
  const parsed = Principal.safeParse({
    userId: payload.sub,
    tenantId: payload["tenant_id"] ?? meta["tenant_id"],
    role: payload["app_role"] ?? meta["app_role"] ?? meta["role"],
  });
  return parsed.success ? parsed.data : null;
}

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
      principal = await this.fromBearer(req, env);
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
    env: Env,
  ): Promise<Principal | null> {
    const auth = header(req, "authorization");
    if (!auth?.startsWith("Bearer ")) return null;
    const token = auth.slice("Bearer ".length);
    const opts = env.SUPABASE_JWT_ISSUER ? { issuer: env.SUPABASE_JWT_ISSUER } : {};
    try {
      let payload: JWTPayload;
      if (env.SUPABASE_JWKS_URL) {
        // Preferred: asymmetric keys via the project JWKS endpoint.
        ({ payload } = await jwtVerify(token, jwksFor(env.SUPABASE_JWKS_URL), {
          algorithms: ["ES256", "RS256"],
          ...opts,
        }));
      } else if (env.SUPABASE_JWT_SECRET) {
        // Legacy: shared HS256 secret. Pin the alg — never let a token pick one.
        ({ payload } = await jwtVerify(
          token,
          new TextEncoder().encode(env.SUPABASE_JWT_SECRET),
          { algorithms: ["HS256"], ...opts },
        ));
      } else {
        return null;
      }
      return principalFromClaims(payload);
    } catch {
      return null;
    }
  }
}

function header(req: RequestWithPrincipal, name: string): string | undefined {
  const v = req.headers[name];
  return Array.isArray(v) ? v[0] : v;
}
