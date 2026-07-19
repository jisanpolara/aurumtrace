import { createHash } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import { auditHashInput, GENESIS_HASH } from "@aurumtrace/shared";
import {
  asNoClaim,
  asTenant,
  freshDb,
  TENANT_A,
  TENANT_B,
  USER_A,
  USER_B,
} from "./harness";

const A = { userId: USER_A, tenantId: TENANT_A, role: "compliance_officer" };
const B = { userId: USER_B, tenantId: TENANT_B, role: "compliance_officer" };

/** Insert one chained audit entry as the given principal (mirrors AuditService). */
async function appendAudit(
  db: PGlite,
  p: { userId: string; tenantId: string; role: string },
  event: string,
  payload: Record<string, unknown>,
) {
  return asTenant(db, p, async (tx) => {
    const tail = await tx.query<{ seq: number; hash: string }>(
      `select seq, hash from public.audit_entries where tenant_id=$1 order by seq desc limit 1`,
      [p.tenantId],
    );
    const last = tail.rows[0];
    const seq = last ? Number(last.seq) + 1 : 0;
    const prevHash = last ? last.hash : GENESIS_HASH;
    const createdAt = new Date(Date.UTC(2026, 5, 22, 10, seq)).toISOString();
    const core = {
      tenantId: p.tenantId as never,
      seq,
      actorId: p.userId as never,
      event: event as never,
      resourceType: null,
      resourceId: null,
      payload,
      createdAt,
    };
    const hash = createHash("sha256").update(auditHashInput(prevHash, core)).digest("hex");
    await tx.query(
      `insert into public.audit_entries
         (tenant_id, seq, actor_id, event, resource_type, resource_id, payload, prev_hash, hash, created_at)
       values ($1,$2,$3,$4,null,null,$5,$6,$7,$8)`,
      [p.tenantId, seq, p.userId, event, payload, prevHash, hash, createdAt],
    );
    return { seq, hash, prevHash };
  });
}

describe("RLS tenant isolation (live Postgres via PGlite)", () => {
  let db: PGlite;
  beforeEach(async () => {
    db = await freshDb();
  });
  afterEach(async () => {
    await db.close();
  });

  it("the enforcing role does NOT bypass RLS (no superuser / bypassrls)", async () => {
    const r = await db.query<{ rolbypassrls: boolean; rolsuper: boolean }>(
      `select rolbypassrls, rolsuper from pg_roles where rolname='authenticated'`,
    );
    expect(r.rows[0]).toMatchObject({ rolbypassrls: false, rolsuper: false });
  });

  it("a tenant sees only its own tenant row", async () => {
    const a = await asTenant(db, A, (tx) => tx.query(`select id from public.tenants`));
    const b = await asTenant(db, B, (tx) => tx.query(`select id from public.tenants`));
    expect(a.rows.map((r: any) => r.id)).toEqual([TENANT_A]);
    expect(b.rows.map((r: any) => r.id)).toEqual([TENANT_B]);
  });

  it("fails closed: no tenant claim returns zero rows", async () => {
    const res = await asNoClaim(db, (tx) => tx.query(`select id from public.tenants`));
    expect(res.rows).toHaveLength(0);
    const aud = await asNoClaim(db, (tx) => tx.query(`select * from public.audit_entries`));
    expect(aud.rows).toHaveLength(0);
  });

  it("audit entries written by tenant A are invisible to tenant B", async () => {
    await appendAudit(db, A, "case.created", { caseRef: "AT-A-1" });
    await appendAudit(db, B, "case.created", { caseRef: "AT-B-1" });

    const seenByA = await asTenant(db, A, (tx) =>
      tx.query(`select payload from public.audit_entries`),
    );
    const seenByB = await asTenant(db, B, (tx) =>
      tx.query(`select payload from public.audit_entries`),
    );
    expect(seenByA.rows).toHaveLength(1);
    expect(seenByB.rows).toHaveLength(1);
    expect((seenByA.rows[0] as any).payload).toEqual({ caseRef: "AT-A-1" });
    expect((seenByB.rows[0] as any).payload).toEqual({ caseRef: "AT-B-1" });
  });

  it("rejects inserting an audit row for a different tenant (WITH CHECK)", async () => {
    await expect(
      asTenant(db, A, (tx) =>
        tx.query(
          `insert into public.audit_entries
             (tenant_id, seq, event, payload, prev_hash, hash)
           values ($1, 0, 'case.created', '{}'::jsonb, $2, $3)`,
          [TENANT_B, GENESIS_HASH, "0".repeat(64)],
        ),
      ),
    ).rejects.toThrow(/row-level security|policy/i);
  });

  it("append-only: the enforcing role cannot UPDATE or DELETE audit rows", async () => {
    await appendAudit(db, A, "case.created", { caseRef: "AT-A-1" });
    await expect(
      asTenant(db, A, (tx) => tx.query(`update public.audit_entries set event='x'`)),
    ).rejects.toThrow();
    await expect(
      asTenant(db, A, (tx) => tx.query(`delete from public.audit_entries`)),
    ).rejects.toThrow();
  });

  it("append-only: trigger blocks mutation even for a privileged (RLS-bypassing) role", async () => {
    await appendAudit(db, A, "case.created", { caseRef: "AT-A-1" });
    // Run as the default superuser (bypasses RLS) to isolate the trigger guard.
    await expect(db.query(`update public.audit_entries set event='x'`)).rejects.toThrow(
      /append-only/i,
    );
    await expect(db.query(`delete from public.audit_entries`)).rejects.toThrow(/append-only/i);
  });

  it("the hash chain links correctly across appends within a tenant", async () => {
    const e0 = await appendAudit(db, A, "case.created", { n: 0 });
    const e1 = await appendAudit(db, A, "screening.run", { n: 1 });
    const e2 = await appendAudit(db, A, "threshold.checked", { n: 2 });
    expect(e0.prevHash).toBe(GENESIS_HASH);
    expect(e1.prevHash).toBe(e0.hash);
    expect(e2.prevHash).toBe(e1.hash);

    const rows = await asTenant(db, A, (tx) =>
      tx.query<{ seq: number; prev_hash: string; hash: string }>(
        `select seq, prev_hash, hash from public.audit_entries order by seq`,
      ),
    );
    expect(rows.rows.map((r) => Number(r.seq))).toEqual([0, 1, 2]);
  });
});
