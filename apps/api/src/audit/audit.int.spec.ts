import { resolve } from "node:path";

process.env.AUTH_DEV_MODE = "true";
process.env.DATABASE_URL = "postgres://unused:unused@localhost:5432/unused";
process.env.SUPABASE_JWT_SECRET = "test-secret";
process.env.DB_APP_ROLE = "authenticated";
process.env.DPMS_THRESHOLD_FILS = "5500000";
process.env.DPMS_AGG_WINDOW_DAYS = "30";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../app.module";
import { TENANT_DATABASE } from "../common/db/tenant-database";
import { PgliteTenantDatabase } from "../common/testing/pglite-database";

const TENANT_A = "00000000-0000-0000-0000-00000000aaaa";
const TENANT_B = "00000000-0000-0000-0000-00000000bbbb";
const USER_A = "00000000-0000-0000-0000-0000000000a1";
const USER_B = "00000000-0000-0000-0000-0000000000b1";
const ha = { "x-debug-user": USER_A, "x-debug-tenant": TENANT_A, "x-debug-role": "compliance_officer" };
const hb = { "x-debug-user": USER_B, "x-debug-tenant": TENANT_B, "x-debug-role": "compliance_officer" };

describe("Audit view + chain integrity (HTTP e2e against PGlite)", () => {
  let app: INestApplication;
  let db: PgliteTenantDatabase;

  beforeAll(async () => {
    db = new PgliteTenantDatabase(resolve(__dirname, "../../../../packages/db/migrations"));
    await db.init();
    await db.seed(
      `insert into public.tenants (id, legal_name, licence_authority, licence_no, goaml_org_id)
       values ($1,'A LLC','DMCC','A-1','FIU-A'), ($2,'B LLC','DMCC','B-1','FIU-B')`,
      [TENANT_A, TENANT_B],
    );
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TENANT_DATABASE)
      .useValue(db)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await db?.close();
  });

  const server = () => app.getHttpServer();

  it("builds a per-case timeline and a tenant chain that verifies", async () => {
    const intake = await request(server())
      .post("/intake/cases")
      .set(ha)
      .send({
        idImageRef: "scan://x",
        item: { itemType: "bar", purityKarat: 24, weightGrams: 250, transactionType: "buy_from_customer" },
      })
      .expect(201);
    const caseId = intake.body.case.id as string;
    await request(server()).post(`/cases/${caseId}/threshold`).set(ha).expect(201);
    await request(server()).post(`/cases/${caseId}/screening`).set(ha).expect(201);

    // Case timeline contains this case's events, every entry tagged with the case.
    const timeline = await request(server()).get(`/cases/${caseId}/audit`).set(ha).expect(200);
    const events = timeline.body.map((e: { event: string }) => e.event);
    expect(events).toEqual(
      expect.arrayContaining(["case.created", "threshold.checked", "screening.run", "risk.scored"]),
    );
    expect(timeline.body.every((e: { caseId: string }) => e.caseId === caseId)).toBe(true);
    // Each entry carries its hash + prev linkage.
    expect(timeline.body[0].hash).toHaveLength(64);

    // Tenant chain integrity verifies.
    const verify = await request(server()).get("/audit/verify").set(ha).expect(200);
    expect(verify.body.ok).toBe(true);
  });

  it("does not expose another tenant's audit timeline", async () => {
    const intakeA = await request(server())
      .post("/intake/cases")
      .set(ha)
      .send({
        idImageRef: "scan://x",
        item: { itemType: "bar", purityKarat: 22, weightGrams: 100, transactionType: "buy_from_customer" },
      })
      .expect(201);
    // Tenant B asking for tenant A's case timeline sees nothing (RLS).
    const asB = await request(server())
      .get(`/cases/${intakeA.body.case.id}/audit`)
      .set(hb)
      .expect(200);
    expect(asB.body).toHaveLength(0);
  });
});
