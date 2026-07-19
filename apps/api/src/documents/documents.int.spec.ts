import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomBytes } from "node:crypto";

const DOCS_DIR = mkdtempSync(join(tmpdir(), "aurumtrace-docs-test-"));
process.env.AUTH_DEV_MODE = "true";
process.env.DATABASE_URL = "postgres://unused:unused@localhost:5432/unused";
process.env.SUPABASE_JWT_SECRET = "test-secret";
process.env.DB_APP_ROLE = "authenticated";
process.env.DOCUMENTS_DIR = DOCS_DIR;
process.env.DOCUMENTS_ENC_KEY = randomBytes(32).toString("base64");

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../app.module";
import { TENANT_DATABASE } from "../common/db/tenant-database";
import { PgliteTenantDatabase } from "../common/testing/pglite-database";
import { LocalEncryptedStore } from "./document-store";
import { loadDocumentKey, sha256Hex } from "./crypto-box";

const TENANT = "00000000-0000-0000-0000-00000000aaaa";
const USER = "00000000-0000-0000-0000-0000000000a1";
const h = { "x-debug-user": USER, "x-debug-tenant": TENANT, "x-debug-role": "compliance_officer" };

describe("Document upload — encrypted at rest (HTTP e2e)", () => {
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

  it("stores ciphertext on disk (never plaintext) and records integrity metadata", async () => {
    const intake = await request(server())
      .post("/intake/cases")
      .set(h)
      .send({
        idImageRef: "scan://x",
        item: { itemType: "bar", purityKarat: 24, weightGrams: 250, transactionType: "buy_from_customer" },
      })
      .expect(201);
    const caseId = intake.body.case.id as string;

    const plaintext = Buffer.from("SENSITIVE source declaration — Emirates ID 784-1987-3456712-9");
    const upload = await request(server())
      .post(`/cases/${caseId}/documents`)
      .set(h)
      .send({
        kind: "source_declaration",
        filename: "declaration.pdf",
        contentBase64: plaintext.toString("base64"),
      })
      .expect(201);

    expect(upload.body.contentHash).toBe(sha256Hex(plaintext));
    expect(upload.body.sizeBytes).toBe(plaintext.length);

    // The bytes on disk must be ciphertext, not the plaintext.
    const [row] = await db.rawQuery<{ storage_path: string }>(
      `select storage_path from public.documents limit 1`,
    );
    const onDisk = readFileSync(join(DOCS_DIR, row!.storage_path));
    expect(onDisk.equals(plaintext)).toBe(false);
    expect(onDisk.includes(Buffer.from("784-1987-3456712-9"))).toBe(false); // no PII in clear

    // And it decrypts back to the original via the store.
    const store = new LocalEncryptedStore(DOCS_DIR, () => loadDocumentKey());
    const decrypted = await store.get(row!.storage_path);
    expect(decrypted.equals(plaintext)).toBe(true);

    const audit = await request(server()).get("/audit").set(h).expect(200);
    expect(audit.body.some((e: { event: string }) => e.event === "document.uploaded")).toBe(true);
  });
});
