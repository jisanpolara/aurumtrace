import type { PGlite } from "@electric-sql/pglite";
import {
  asNoClaim,
  asTenant,
  DOMAIN_TABLES,
  freshDb,
  TENANT_A,
  TENANT_B,
  USER_A,
  USER_B,
} from "./harness";

const A = { userId: USER_A, tenantId: TENANT_A, role: "compliance_officer" };
const B = { userId: USER_B, tenantId: TENANT_B, role: "compliance_officer" };
const A_AUDITOR = { userId: USER_A, tenantId: TENANT_A, role: "auditor" };

describe("domain-table RLS (Step 2)", () => {
  let db: PGlite;
  beforeEach(async () => {
    db = await freshDb();
  });
  afterEach(async () => {
    await db.close();
  });

  it("W3 guard: EVERY public table has RLS enabled AND forced", async () => {
    const res = await db.query<{ relname: string }>(`
      select c.relname
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public'
         and c.relkind = 'r'
         and (not c.relrowsecurity or not c.relforcerowsecurity)
    `);
    // Any table here lacks ENABLE+FORCE RLS — a tenant-isolation hole.
    expect(res.rows.map((r) => r.relname)).toEqual([]);
  });

  it("all domain tables are present and RLS-protected", async () => {
    const res = await db.query<{ relname: string }>(`
      select c.relname from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname='public' and c.relkind='r'
        and c.relrowsecurity and c.relforcerowsecurity
    `);
    const names = res.rows.map((r) => r.relname);
    for (const t of DOMAIN_TABLES) expect(names).toContain(t);
  });

  it("customers are isolated per tenant", async () => {
    await asTenant(db, A, (tx) =>
      tx.query(`insert into public.customers (tenant_id, full_name) values ($1,'Rashid A.')`, [
        TENANT_A,
      ]),
    );
    await asTenant(db, B, (tx) =>
      tx.query(`insert into public.customers (tenant_id, full_name) values ($1,'Other Person')`, [
        TENANT_B,
      ]),
    );

    const a = await asTenant(db, A, (tx) =>
      tx.query(`select full_name from public.customers`),
    );
    const b = await asTenant(db, B, (tx) =>
      tx.query(`select full_name from public.customers`),
    );
    expect(a.rows).toHaveLength(1);
    expect(b.rows).toHaveLength(1);
    expect((a.rows[0] as any).full_name).toBe("Rashid A.");
  });

  it("fails closed: no claim sees no customers or cases", async () => {
    await asTenant(db, A, (tx) =>
      tx.query(`insert into public.customers (tenant_id, full_name) values ($1,'Rashid A.')`, [
        TENANT_A,
      ]),
    );
    const cust = await asNoClaim(db, (tx) => tx.query(`select * from public.customers`));
    const cases = await asNoClaim(db, (tx) => tx.query(`select * from public.cases`));
    expect(cust.rows).toHaveLength(0);
    expect(cases.rows).toHaveLength(0);
  });

  it("rejects inserting a customer for another tenant (WITH CHECK)", async () => {
    await expect(
      asTenant(db, A, (tx) =>
        tx.query(`insert into public.customers (tenant_id, full_name) values ($1,'X')`, [
          TENANT_B,
        ]),
      ),
    ).rejects.toThrow(/row-level security|policy/i);
  });

  it("auditor role is read-only: can SELECT but not INSERT", async () => {
    await asTenant(db, A, (tx) =>
      tx.query(`insert into public.customers (tenant_id, full_name) values ($1,'Rashid A.')`, [
        TENANT_A,
      ]),
    );

    // Auditor can read its tenant's data.
    const read = await asTenant(db, A_AUDITOR, (tx) =>
      tx.query(`select full_name from public.customers`),
    );
    expect(read.rows).toHaveLength(1);

    // Auditor cannot write.
    await expect(
      asTenant(db, A_AUDITOR, (tx) =>
        tx.query(`insert into public.customers (tenant_id, full_name) values ($1,'Sneaky')`, [
          TENANT_A,
        ]),
      ),
    ).rejects.toThrow(/row-level security|policy/i);
  });

  it("a case + its items stay within the tenant", async () => {
    const caseId = await asTenant(db, A, async (tx) => {
      const c = await tx.query<{ id: string }>(
        `insert into public.cases (tenant_id, reference) values ($1,'AT-2026-000148') returning id`,
        [TENANT_A],
      );
      const id = c.rows[0]!.id;
      await tx.query(
        `insert into public.items (tenant_id, case_id, item_type, weight_grams, transaction_type, value_fils)
         values ($1,$2,'bar',250,'buy_from_customer',6140000)`,
        [TENANT_A, id],
      );
      return id;
    });
    expect(caseId).toBeTruthy();

    const seenByB = await asTenant(db, B, (tx) =>
      tx.query(`select id from public.items`),
    );
    expect(seenByB.rows).toHaveLength(0);
  });

  it("rejects a child row that references another tenant's parent (composite FK)", async () => {
    // Tenant B owns a customer.
    const bCustomer = await asTenant(db, B, async (tx) => {
      const r = await tx.query<{ id: string }>(
        `insert into public.customers (tenant_id, full_name) values ($1,'B Person') returning id`,
        [TENANT_B],
      );
      return r.rows[0]!.id;
    });

    // Tenant A tries to create a case (tenant_id = A) pointing at B's customer.
    // RLS would accept the row (tenant_id = A), but the composite FK
    // (A, bCustomer) has no match in customers(tenant_id, id) -> rejected.
    await expect(
      asTenant(db, A, (tx) =>
        tx.query(
          `insert into public.cases (tenant_id, reference, customer_id) values ($1,'AT-X',$2)`,
          [TENANT_A, bCustomer],
        ),
      ),
    ).rejects.toThrow(/foreign key|violates/i);
  });

  it("auditor UPDATE is a silent no-op (0 rows), leaving data intact", async () => {
    await asTenant(db, A, (tx) =>
      tx.query(`insert into public.customers (tenant_id, full_name) values ($1,'Rashid A.')`, [
        TENANT_A,
      ]),
    );

    const upd = await asTenant(db, A_AUDITOR, (tx) =>
      tx.query(`update public.customers set full_name='HACKED'`),
    );
    expect(upd.affectedRows).toBe(0);

    const after = await asTenant(db, A, (tx) =>
      tx.query(`select full_name from public.customers`),
    );
    expect((after.rows[0] as any).full_name).toBe("Rashid A.");
  });
});
