import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import type { Principal } from "@aurumtrace/shared";
import type { Queryer, TenantDatabase } from "../db/tenant-database";

const MIGRATIONS = [
  "0001_init.sql",
  "0002_rls.sql",
  "0003_audit_append_only.sql",
  "0004_domain_tables.sql",
  "0005_domain_rls.sql",
  "0006_audit_case_id.sql",
  "0007_case_occurred_at.sql",
];

/**
 * TEST/DEV TenantDatabase backed by in-process PGlite (real Postgres in WASM).
 * Excluded from the production build (tsconfig.build.json). Runs the real
 * migrations and the same role/grant setup as Supabase, so RLS behaves
 * identically to production. Lets the full API run + be e2e-tested with no
 * external Postgres.
 */
export class PgliteTenantDatabase implements TenantDatabase {
  private db!: PGlite;
  private readonly migrationsDir: string;

  constructor(migrationsDir?: string) {
    this.migrationsDir =
      migrationsDir ?? resolve(process.cwd(), "../../packages/db/migrations");
  }

  async init(): Promise<void> {
    this.db = await PGlite.create();
    // Enforcing role before migrations so 0003's conditional revoke targets it.
    await this.db.exec(`create role authenticated nologin noinherit;`);
    for (const m of MIGRATIONS) {
      const sql = readFileSync(join(this.migrationsDir, m), "utf8").replace(
        /create\s+extension[^;]*pgcrypto[^;]*;/gi,
        "-- pgcrypto (core in PGlite)",
      );
      await this.db.exec(sql);
    }
    await this.db.exec(`
      grant usage on schema public, app to authenticated;
      grant select on public.tenants, public.memberships to authenticated;
      grant select, insert on public.audit_entries to authenticated;
      grant select, insert, update on
        public.customers, public.cases, public.items, public.screening_results,
        public.sourcing_records, public.reports, public.documents to authenticated;
    `);
  }

  /** Superuser query for test seeding (bypasses RLS). */
  async seed(text: string, params?: unknown[]): Promise<void> {
    await this.db.query(text, params as unknown[] | undefined);
  }

  /** Superuser read for test introspection (bypasses RLS). */
  async rawQuery<R = Record<string, unknown>>(text: string, params?: unknown[]): Promise<R[]> {
    const res = await this.db.query(text, params as unknown[] | undefined);
    return res.rows as R[];
  }

  async close(): Promise<void> {
    await this.db.close();
  }

  async withTenant<T>(principal: Principal, fn: (q: Queryer) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.exec(`set local role authenticated`);
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({
          sub: principal.userId,
          tenant_id: principal.tenantId,
          role: principal.role,
        }),
      ]);
      const q: Queryer = {
        async query(text, params) {
          const res = await tx.query(text, params as unknown[] | undefined);
          return { rows: res.rows as never[] };
        },
      };
      return fn(q);
    }) as T;
  }
}
