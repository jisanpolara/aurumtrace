import { resolve } from "node:path";

process.env.AUTH_DEV_MODE = "true";
process.env.DATABASE_URL = "postgres://unused:unused@localhost:5432/unused";
process.env.SUPABASE_JWT_SECRET = "test-secret";
process.env.DB_APP_ROLE = "authenticated";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../app.module";
import { TENANT_DATABASE } from "../common/db/tenant-database";
import { PgliteTenantDatabase } from "../common/testing/pglite-database";

const TENANT = "00000000-0000-0000-0000-00000000aaaa";
const USER = "00000000-0000-0000-0000-0000000000a1";
const h = { "x-debug-user": USER, "x-debug-tenant": TENANT, "x-debug-role": "compliance_officer" };
const allSteps = {
  managementSystems: true,
  riskAssessment: true,
  riskStrategy: true,
  audit: true,
  reporting: true,
};

describe("Responsible sourcing (HTTP e2e against PGlite)", () => {
  let app: INestApplication;
  let db: PgliteTenantDatabase;

  beforeAll(async () => {
    db = new PgliteTenantDatabase(resolve(__dirname, "../../../../packages/db/migrations"));
    await db.init();
    await db.seed(
      `insert into public.tenants (id, legal_name, licence_authority, licence_no) values ($1,'A','DMCC','A-1')`,
      [TENANT],
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

  async function newCase(): Promise<string> {
    const r = await request(server())
      .post("/intake/cases")
      .set(h)
      .send({
        idImageRef: "scan://x",
        item: { itemType: "bar", purityKarat: 24, weightGrams: 250, transactionType: "buy_from_customer" },
      })
      .expect(201);
    return r.body.case.id as string;
  }

  it("rates customer-owned with all OECD steps as Low and audits it", async () => {
    const caseId = await newCase();
    const res = await request(server())
      .post(`/cases/${caseId}/sourcing`)
      .set(h)
      .send({ declarationType: "customer_owned", steps: allSteps })
      .expect(201);
    expect(res.body.risk).toBe("low");
    expect(res.body.completedSteps).toBe(5);

    const audit = await request(server()).get("/audit").set(h).expect(200);
    expect(audit.body.some((e: { event: string }) => e.event === "sourcing.completed")).toBe(true);
  });

  it("rates an incomplete dealer-sourced declaration as High", async () => {
    const caseId = await newCase();
    const res = await request(server())
      .post(`/cases/${caseId}/sourcing`)
      .set(h)
      .send({ declarationType: "dealer_sourced", steps: { ...allSteps, audit: false, reporting: false } })
      .expect(201);
    expect(res.body.risk).toBe("high");
  });
});
