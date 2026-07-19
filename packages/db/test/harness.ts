import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";

/** Two fixed tenants + a user in each, for isolation tests. */
export const TENANT_A = "00000000-0000-0000-0000-00000000aaaa";
export const TENANT_B = "00000000-0000-0000-0000-00000000bbbb";
export const USER_A = "00000000-0000-0000-0000-0000000000a1";
export const USER_B = "00000000-0000-0000-0000-0000000000b1";

const MIGRATIONS = [
  "0001_init.sql",
  "0002_rls.sql",
  "0003_audit_append_only.sql",
  "0004_domain_tables.sql",
  "0005_domain_rls.sql",
  "0006_audit_case_id.sql",
  "0007_case_occurred_at.sql",
];

/** Domain tables that should be tenant-isolated + writable by non-auditor roles. */
export const DOMAIN_TABLES = [
  "customers",
  "cases",
  "items",
  "screening_results",
  "sourcing_records",
  "reports",
  "documents",
] as const;

function loadMigration(name: string): string {
  const sql = readFileSync(join(__dirname, "..", "migrations", name), "utf8");
  // PGlite does not bundle the pgcrypto extension; gen_random_uuid() is core in
  // PG16, so dropping the `create extension` line is safe for the test. (Supabase
  // ships pgcrypto, so the migration is unchanged for production.)
  return sql.replace(/create\s+extension[^;]*pgcrypto[^;]*;/gi, "-- pgcrypto (core in PGlite)");
}

/**
 * Build a fresh in-memory Postgres with the real migrations applied, an
 * `authenticated` role that is subject to RLS (mirrors Supabase), and two
 * seeded tenants. Returns the PGlite instance.
 */
export async function freshDb(): Promise<PGlite> {
  const db = await PGlite.create();

  // Create the enforcing role BEFORE migrations so 0003's conditional revoke targets it.
  await db.exec(`create role authenticated nologin noinherit;`);

  for (const m of MIGRATIONS) {
    await db.exec(loadMigration(m));
  }

  // Supabase grants base table privileges to `authenticated`; RLS then restricts
  // rows. We grant SELECT/INSERT only — UPDATE/DELETE stay ungranted (and 0003
  // also revokes them), so the audit log is append-only for this role.
  await db.exec(`
    grant usage on schema public, app to authenticated;
    grant select on public.tenants, public.memberships to authenticated;
    grant select, insert on public.audit_entries to authenticated;
    grant select, insert, update on
      public.customers, public.cases, public.items, public.screening_results,
      public.sourcing_records, public.reports, public.documents to authenticated;
  `);

  // Seed two tenants + a membership each.
  await db.query(
    `insert into public.tenants (id, legal_name, licence_authority, licence_no, goaml_org_id)
     values ($1,'Tenant A LLC','DMCC','A-1','FIU-A'), ($2,'Tenant B LLC','DMCC','B-1','FIU-B')`,
    [TENANT_A, TENANT_B],
  );
  await db.query(
    `insert into public.memberships (user_id, tenant_id, role)
     values ($1,$2,'compliance_officer'), ($3,$4,'compliance_officer')`,
    [USER_A, TENANT_A, USER_B, TENANT_B],
  );

  return db;
}

export type Principal = { userId: string; tenantId: string; role: string };

/**
 * Run `fn` as the `authenticated` role with `principal`'s JWT claims set — the
 * exact mechanism apps/api uses in DatabaseService.withTenant. RLS enforces.
 */
export async function asTenant<T>(
  db: PGlite,
  principal: Principal,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role authenticated`);
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({
        sub: principal.userId,
        tenant_id: principal.tenantId,
        role: principal.role,
      }),
    ]);
    return fn(tx);
  });
}

/** Run `fn` as `authenticated` with NO tenant claim set — the fail-closed path. */
export async function asNoClaim<T>(
  db: PGlite,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role authenticated`);
    return fn(tx);
  });
}
