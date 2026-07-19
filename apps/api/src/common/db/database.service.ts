import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { Pool } from "pg";
import type { Principal } from "@aurumtrace/shared";
import { loadEnv } from "../../config/env";
import type { Queryer, TenantDatabase } from "./tenant-database";

const ROLE_RE = /^[a-z_][a-z0-9_]*$/;

/**
 * Production TenantDatabase backed by a Postgres connection pool. Each call
 * opens a transaction, switches to the (non-BYPASSRLS) app role, and sets
 * `request.jwt.claims` so RLS enforces tenant isolation. Rolls back on error.
 */
@Injectable()
export class PgPoolDatabase implements TenantDatabase, OnModuleInit, OnModuleDestroy {
  private pool!: Pool;
  private role!: string;

  onModuleInit(): void {
    const env = loadEnv();
    if (!ROLE_RE.test(env.DB_APP_ROLE)) {
      throw new Error(`Unsafe DB_APP_ROLE: ${env.DB_APP_ROLE}`);
    }
    this.role = env.DB_APP_ROLE;
    // Managed Postgres (Supabase) requires TLS; local Postgres does not. Enable
    // SSL for any non-local host. `rejectUnauthorized: false` accepts the
    // provider's chain without shipping a CA bundle — fine for the pooled URL.
    const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(env.DATABASE_URL);
    this.pool = new Pool({
      connectionString: env.DATABASE_URL,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }

  async withTenant<T>(
    principal: Principal,
    fn: (q: Queryer) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query(`set local role ${this.role}`); // role validated on init
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({
          sub: principal.userId,
          tenant_id: principal.tenantId,
          role: principal.role,
        }),
      ]);
      const q: Queryer = {
        async query(text, params) {
          const res = await client.query(text, params);
          return { rows: res.rows };
        },
      };
      const result = await fn(q);
      await client.query("commit");
      return result;
    } catch (err) {
      await client.query("rollback").catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }
}
