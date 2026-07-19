import { resolve } from "node:path";

process.env.AUTH_DEV_MODE = "true";
process.env.DATABASE_URL = "postgres://unused:unused@localhost:5432/unused";
process.env.SUPABASE_JWT_SECRET = "test-secret";
process.env.DB_APP_ROLE = "authenticated";
// CONFIRMED policy for a deterministic test (AED 55,000 / 30 days).
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
const h = (t: string, u: string) => ({
  "x-debug-user": u,
  "x-debug-tenant": t,
  "x-debug-role": "compliance_officer",
});
const itemBody = (weightGrams: number) => ({
  idImageRef: "scan://x",
  item: { itemType: "bar", purityKarat: 24, weightGrams, transactionType: "buy_from_customer" },
});

describe("Threshold determination (HTTP e2e against PGlite)", () => {
  let app: INestApplication;
  let db: PgliteTenantDatabase;

  beforeAll(async () => {
    db = new PgliteTenantDatabase(resolve(__dirname, "../../../../packages/db/migrations"));
    await db.init();
    await db.seed(
      `insert into public.tenants (id, legal_name, licence_authority, licence_no)
       values ($1,'A LLC','DMCC','A-1'), ($2,'B LLC','DMCC','B-1')`,
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

  it("aggregates two linked transactions to cross the threshold", async () => {
    // Two intakes for tenant A → same OCR customer → two linked cases (120g each = 2,947,200 fils).
    await request(server()).post("/intake/cases").set(h(TENANT_A, USER_A)).send(itemBody(120)).expect(201);
    const second = await request(server())
      .post("/intake/cases")
      .set(h(TENANT_A, USER_A))
      .send(itemBody(120))
      .expect(201);
    const caseId = second.body.case.id as string;

    const res = await request(server())
      .post(`/cases/${caseId}/threshold`)
      .set(h(TENANT_A, USER_A))
      .expect(201);

    expect(res.body.aggregateFils).toBe(5_894_400); // 2 × 2,947,200
    expect(res.body.reportable).toBe(true);
    expect(res.body.linkedCaseIds).toHaveLength(2);
    expect(res.body.provisional).toBe(false); // env-configured policy

    // Case status persisted, and the determination is audited.
    const cases = await request(server()).get("/cases").set(h(TENANT_A, USER_A)).expect(200);
    const updated = cases.body.find((c: { id: string }) => c.id === caseId);
    expect(updated.status).toBe("reportable");

    const audit = await request(server()).get("/audit").set(h(TENANT_A, USER_A)).expect(200);
    expect(audit.body.some((e: { event: string }) => e.event === "threshold.checked")).toBe(true);
  });

  it("does not aggregate across tenants (tenant B sees only its own transaction)", async () => {
    const bCase = await request(server())
      .post("/intake/cases")
      .set(h(TENANT_B, USER_B))
      .send(itemBody(120))
      .expect(201);

    const res = await request(server())
      .post(`/cases/${bCase.body.case.id}/threshold`)
      .set(h(TENANT_B, USER_B))
      .expect(201);

    // Only B's single 2,947,200 — none of tenant A's linked transactions leak in.
    expect(res.body.aggregateFils).toBe(2_947_200);
    expect(res.body.reportable).toBe(false);
    expect(res.body.linkedCaseIds).toHaveLength(1);
  });
});
