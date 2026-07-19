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

describe("goAML report (HTTP e2e against PGlite)", () => {
  let app: INestApplication;
  let db: PgliteTenantDatabase;

  beforeAll(async () => {
    db = new PgliteTenantDatabase(resolve(__dirname, "../../../../packages/db/migrations"));
    await db.init();
    await db.seed(
      `insert into public.tenants (id, legal_name, licence_authority, licence_no, goaml_org_id)
       values ($1,'Al Noor Gold Trading LLC','DMCC','DMCC-7741','UAE-FIU-44821')`,
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

  it("drafts a provisional report (pending review) and does NOT file it", async () => {
    const intake = await request(server())
      .post("/intake/cases")
      .set(h)
      .send({
        idImageRef: "scan://x",
        item: { itemType: "bar", purityKarat: 24, weightGrams: 250, transactionType: "buy_from_customer" },
      })
      .expect(201);
    const caseId = intake.body.case.id as string;
    await request(server()).post(`/cases/${caseId}/threshold`).set(h).expect(201);
    await request(server()).post(`/cases/${caseId}/screening`).set(h).expect(201);

    const draft = await request(server()).post(`/cases/${caseId}/report`).set(h).expect(201);
    expect(draft.body.provisional).toBe(true);
    expect(draft.body.status).toBe("pending_review");
    expect(draft.body.xml).toContain("<report_type>DPMSR</report_type>");
    expect(draft.body.xml).toMatch(/PROVISIONAL goAML DPMSR draft/);
    expect(draft.body.validation.valid).toBe(true);
    expect(draft.body.narrative.length).toBeGreaterThan(0);

    // Drafting must NOT file: audit has report.drafted but never report.filed.
    const audit = await request(server()).get("/audit").set(h).expect(200);
    const events = audit.body.map((e: { event: string }) => e.event);
    expect(events).toContain("report.drafted");
    expect(events).not.toContain("report.filed");

    // Now the explicit human file action.
    const filed = await request(server())
      .post(`/reports/${draft.body.id}/file`)
      .set(h)
      .expect(201);
    expect(filed.body.status).toBe("filed");

    const audit2 = await request(server()).get("/audit").set(h).expect(200);
    expect(audit2.body.map((e: { event: string }) => e.event)).toContain("report.filed");

    // A filed report can never be silently re-opened by re-drafting (W1).
    await request(server()).post(`/cases/${caseId}/report`).set(h).expect(409);
  });

  it("forbids a non-filing role (counter staff) from filing", async () => {
    const intake = await request(server())
      .post("/intake/cases")
      .set(h)
      .send({
        idImageRef: "scan://x",
        item: { itemType: "bar", purityKarat: 24, weightGrams: 250, transactionType: "buy_from_customer" },
      })
      .expect(201);
    const caseId = intake.body.case.id as string;
    const draft = await request(server()).post(`/cases/${caseId}/report`).set(h).expect(201);

    const staff = { "x-debug-user": USER, "x-debug-tenant": TENANT, "x-debug-role": "staff" };
    await request(server()).post(`/reports/${draft.body.id}/file`).set(staff).expect(403);
  });
});
