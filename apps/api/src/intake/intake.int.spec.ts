import { resolve } from "node:path";

// Dev-mode auth + dummy connection config must be set before the app reads env.
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

const TENANT_A = "00000000-0000-0000-0000-00000000aaaa";
const TENANT_B = "00000000-0000-0000-0000-00000000bbbb";
const USER_A = "00000000-0000-0000-0000-0000000000a1";
const USER_B = "00000000-0000-0000-0000-0000000000b1";

const headers = (tenant: string, user: string, role = "compliance_officer") => ({
  "x-debug-user": user,
  "x-debug-tenant": tenant,
  "x-debug-role": role,
});

describe("Intake (HTTP e2e against PGlite)", () => {
  let app: INestApplication;
  let db: PgliteTenantDatabase;

  beforeAll(async () => {
    db = new PgliteTenantDatabase(resolve(__dirname, "../../../../packages/db/migrations"));
    await db.init();
    await db.seed(
      `insert into public.tenants (id, legal_name, licence_authority, licence_no)
       values ($1,'Tenant A LLC','DMCC','A-1'), ($2,'Tenant B LLC','DMCC','B-1')`,
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

  it("rejects an unauthenticated request", async () => {
    await request(server()).post("/intake/cases").send({}).expect(401);
  });

  it("creates a case, values the item via the gold price, and is tenant A's", async () => {
    const res = await request(server())
      .post("/intake/cases")
      .set(headers(TENANT_A, USER_A))
      .send({
        idImageRef: "scan://demo",
        item: {
          itemType: "bar",
          purityKarat: 24,
          weightGrams: 250,
          transactionType: "buy_from_customer",
        },
      })
      .expect(201);

    expect(res.body.case.reference).toBe(`AT-${new Date().getFullYear()}-000001`);
    expect(res.body.case.status).toBe("draft");
    // 250 g × 24,560 fils/g (AED 245.60) = 6,140,000 fils = AED 61,400.
    expect(res.body.item.valueFils).toBe(6_140_000);
    expect(res.body.valuation.filsPerGram).toBe(24_560);
    expect(res.body.customer.fullName).toBe("Rashid Al Maktoum");
  });

  it("writes an atomic, verifiable audit trail for the intake", async () => {
    const list = await request(server()).get("/audit").set(headers(TENANT_A, USER_A)).expect(200);
    const events = list.body.map((e: { event: string }) => e.event);
    expect(events).toEqual(expect.arrayContaining(["case.created", "intake.id_scanned"]));

    const verify = await request(server())
      .get("/audit/verify")
      .set(headers(TENANT_A, USER_A))
      .expect(200);
    expect(verify.body.ok).toBe(true);
  });

  it("isolates tenants: B sees none of A's data", async () => {
    const me = await request(server()).get("/me").set(headers(TENANT_B, USER_B)).expect(200);
    expect(me.body.tenant.id).toBe(TENANT_B);

    const audit = await request(server()).get("/audit").set(headers(TENANT_B, USER_B)).expect(200);
    expect(audit.body).toHaveLength(0);
  });

  it("auditor cannot create a case (read-only role)", async () => {
    await request(server())
      .post("/intake/cases")
      .set(headers(TENANT_A, USER_A, "auditor"))
      .send({
        idImageRef: "scan://demo",
        item: {
          itemType: "bar",
          purityKarat: 24,
          weightGrams: 100,
          transactionType: "buy_from_customer",
        },
      })
      .expect(500); // RLS WITH CHECK rejects the insert
  });
});
