import type { Principal } from "@aurumtrace/shared";

/** Minimal query surface both the pg PoolClient and a PGlite tx satisfy. */
export interface Queryer {
  query<R = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: R[] }>;
}

/**
 * The only sanctioned way to run tenant data queries. Implementations open a
 * transaction, switch to the (non-BYPASSRLS) app role, and set
 * `request.jwt.claims` so the database's RLS policies enforce isolation —
 * application code never scopes by tenant itself.
 */
export interface TenantDatabase {
  withTenant<T>(principal: Principal, fn: (q: Queryer) => Promise<T>): Promise<T>;
}

/** DI token; impl is chosen by env (pg pool for prod, PGlite for dev/test). */
export const TENANT_DATABASE = Symbol("TENANT_DATABASE");
