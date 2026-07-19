/**
 * Local dev API backed by in-process PGlite (no external Postgres needed).
 * Excluded from the production build. Run: `pnpm --filter @aurumtrace/api dev:pglite`.
 *
 * It wires the REAL service classes (IntakeService/CasesService/AuditService)
 * by hand over a thin node:http layer. We construct them directly rather than
 * through Nest DI because the dev runner (tsx/esbuild) doesn't emit the
 * decorator metadata Nest's type-based injection needs. The Nest controllers +
 * guards are covered separately by the supertest e2e (intake.int.spec.ts).
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Principal } from "@aurumtrace/shared";
import {
  MockGoldPriceAdapter,
  MockLlmAdapter,
  MockOcrAdapter,
  MockScreeningAdapter,
} from "@aurumtrace/integrations";
import { PgliteTenantDatabase } from "./common/testing/pglite-database";
import { AuditService } from "./audit/audit.service";
import { IntakeService } from "./intake/intake.service";
import { CasesService } from "./cases/cases.service";
import { ThresholdService } from "./threshold/threshold.service";
import { ScreeningService } from "./screening/screening.service";
import { SourcingService, SourcingRequest } from "./sourcing/sourcing.service";
import { DocumentsService, UploadDocumentRequest } from "./documents/documents.service";
import { LocalEncryptedStore } from "./documents/document-store";
import { loadDocumentKey } from "./documents/crypto-box";
import { ReportService } from "./reporting/report.service";
import { CustomersService } from "./customers/customers.service";
import { CreateCaseRequest } from "./intake/dto";

const TENANT = "00000000-0000-0000-0000-00000000aaaa";
const CUSTOMER = "00000000-0000-0000-0000-0000000000c1";
const CASE = "00000000-0000-0000-0000-00000000ca47";

function principalOf(req: IncomingMessage): Principal | null {
  const h = (n: string) => {
    const v = req.headers[n];
    return Array.isArray(v) ? v[0] : v;
  };
  const parsed = Principal.safeParse({
    userId: h("x-debug-user"),
    tenantId: h("x-debug-tenant"),
    role: h("x-debug-role"),
  });
  return parsed.success ? parsed.data : null;
}

function body(req: IncomingMessage): Promise<unknown> {
  return new Promise((res) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      try {
        res(data ? JSON.parse(data) : {});
      } catch {
        res({});
      }
    });
  });
}

async function main(): Promise<void> {
  const db = new PgliteTenantDatabase(resolve(__dirname, "../../../packages/db/migrations"));
  await db.init();
  await db.seed(
    `insert into public.tenants (id, legal_name, licence_authority, licence_no, goaml_org_id)
     values ($1,'Al Noor Gold Trading LLC','DMCC','DMCC-7741','UAE-FIU-44821')`,
    [TENANT],
  );
  await db.seed(
    `insert into public.customers (id, tenant_id, full_name, emirates_id, nationality, residency_status, risk_rating)
     values ($1,$2,'Mariam Saleh','784-1991-2210034-1','UAE','resident','low')`,
    [CUSTOMER, TENANT],
  );
  await db.seed(
    `insert into public.cases (id, tenant_id, reference, customer_id, stage, status)
     values ($1,$2,'AT-2026-000147',$3,2,'in_review')`,
    [CASE, TENANT, CUSTOMER],
  );
  await db.seed(
    `insert into public.items (id, tenant_id, case_id, item_type, purity_karat, weight_grams, transaction_type, gold_price_fils_per_gram, value_fils)
     values (gen_random_uuid(),$1,$2,'coins',24,120,'buy_from_customer',24560,2947200)`,
    [TENANT, CASE],
  );

  const audit = new AuditService(db);
  const intake = new IntakeService(db, new MockGoldPriceAdapter(), new MockOcrAdapter(), audit);
  const cases = new CasesService(db);
  const threshold = new ThresholdService(db, audit);
  const screening = new ScreeningService(db, new MockScreeningAdapter(), audit);
  const sourcing = new SourcingService(db, audit);
  process.env.DOCUMENTS_ENC_KEY ??= randomBytes(32).toString("base64"); // dev-only key
  const docStore = new LocalEncryptedStore(
    process.env.DOCUMENTS_DIR ?? join(tmpdir(), "aurumtrace-docs"),
    () => loadDocumentKey(),
  );
  const documents = new DocumentsService(db, docStore, audit);
  const reports = new ReportService(db, new MockLlmAdapter(), audit);
  const customers = new CustomersService(db);

  const send = (res: ServerResponse, code: number, payload: unknown) => {
    res.writeHead(code, {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type,x-debug-user,x-debug-tenant,x-debug-role",
    });
    res.end(JSON.stringify(payload));
  };

  const server = createServer(async (req, res) => {
    try {
      if (req.method === "OPTIONS") return send(res, 204, {});
      const url = new URL(req.url ?? "/", "http://localhost");
      const principal = principalOf(req);
      if (!principal) return send(res, 401, { message: "unauthenticated" });

      if (req.method === "GET" && url.pathname === "/cases") {
        return send(res, 200, await cases.listRecent(principal, 10));
      }
      if (req.method === "POST" && url.pathname === "/intake/cases") {
        const parsed = CreateCaseRequest.safeParse(await body(req));
        if (!parsed.success) return send(res, 400, parsed.error.flatten());
        return send(res, 201, await intake.createCase(principal, parsed.data));
      }
      if (req.method === "GET" && url.pathname === "/dashboard/summary") {
        return send(res, 200, await cases.summary(principal));
      }
      if (req.method === "GET" && url.pathname === "/customers") {
        return send(res, 200, await customers.list(principal));
      }
      if (req.method === "GET" && url.pathname === "/reports") {
        return send(res, 200, await reports.list(principal));
      }
      if (req.method === "GET" && url.pathname === "/audit") {
        return send(res, 200, await audit.list(principal));
      }
      if (req.method === "GET" && url.pathname === "/audit/verify") {
        return send(res, 200, await audit.verify(principal));
      }
      const caud = url.pathname.match(/^\/cases\/([^/]+)\/audit$/);
      if (req.method === "GET" && caud) {
        return send(res, 200, await audit.listForCase(principal, caud[1]!));
      }
      const thr = url.pathname.match(/^\/cases\/([^/]+)\/threshold$/);
      if (req.method === "POST" && thr) {
        return send(res, 201, await threshold.check(principal, thr[1]!));
      }
      const scr = url.pathname.match(/^\/cases\/([^/]+)\/screening$/);
      if (req.method === "POST" && scr) {
        return send(res, 201, await screening.run(principal, scr[1]!));
      }
      const src = url.pathname.match(/^\/cases\/([^/]+)\/sourcing$/);
      if (req.method === "POST" && src) {
        const p = SourcingRequest.safeParse(await body(req));
        if (!p.success) return send(res, 400, p.error.flatten());
        return send(res, 201, await sourcing.submit(principal, src[1]!, p.data));
      }
      const doc = url.pathname.match(/^\/cases\/([^/]+)\/documents$/);
      if (req.method === "POST" && doc) {
        const p = UploadDocumentRequest.safeParse(await body(req));
        if (!p.success) return send(res, 400, p.error.flatten());
        return send(res, 201, await documents.upload(principal, doc[1]!, p.data));
      }
      const rep = url.pathname.match(/^\/cases\/([^/]+)\/report$/);
      if (req.method === "POST" && rep) {
        return send(res, 201, await reports.draft(principal, rep[1]!));
      }
      const fil = url.pathname.match(/^\/reports\/([^/]+)\/file$/);
      if (req.method === "POST" && fil) {
        return send(res, 201, await reports.file(principal, fil[1]!));
      }
      return send(res, 404, { message: "not found" });
    } catch (err) {
      send(res, 500, { message: err instanceof Error ? err.message : "error" });
    }
  });

  server.listen(3001, () => {
    // eslint-disable-next-line no-console
    console.log("AurumTrace dev API (PGlite) on http://localhost:3001");
  });
}

void main();
