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

const TENANT = "00000000-0000-0000-0000-00000000aaaa";
const USER = "00000000-0000-0000-0000-0000000000a1";
const h = { "x-debug-user": USER, "x-debug-tenant": TENANT, "x-debug-role": "compliance_officer" };

describe("KYC/CDD screening + risk (HTTP e2e against PGlite)", () => {
  let app: INestApplication;
  let db: PgliteTenantDatabase;

  beforeAll(async () => {
    db = new PgliteTenantDatabase(resolve(__dirname, "../../../../packages/db/migrations"));
    await db.init();
    await db.seed(
      `insert into public.tenants (id, legal_name, licence_authority, licence_no)
       values ($1,'A LLC','DMCC','A-1')`,
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

  it("runs screening + risk after a reportable intake and audits it", async () => {
    const intake = await request(server())
      .post("/intake/cases")
      .set(h)
      .send({
        idImageRef: "scan://x",
        item: { itemType: "bar", purityKarat: 24, weightGrams: 250, transactionType: "buy_from_customer" },
      })
      .expect(201);
    const caseId = intake.body.case.id as string;

    // 250 g × 24,560 = 6,140,000 fils > AED 55,000 → reportable.
    await request(server()).post(`/cases/${caseId}/threshold`).set(h).expect(201);

    const res = await request(server()).post(`/cases/${caseId}/screening`).set(h).expect(201);

    // Clean mock screening (no matches, identity verified) + reportable transaction.
    expect(res.body.screening.sanctionsMatch).toBe(false);
    expect(res.body.screening.identityVerified).toBe(true);
    // 30 baseline + 25 reportable = 55 → medium.
    expect(res.body.risk.score).toBe(55);
    expect(res.body.risk.band).toBe("medium");
    expect(res.body.risk.forcedHigh).toBe(false);

    const audit = await request(server()).get("/audit").set(h).expect(200);
    const events = audit.body.map((e: { event: string }) => e.event);
    expect(events).toEqual(expect.arrayContaining(["screening.run", "risk.scored", "threshold.checked"]));
  });
});
