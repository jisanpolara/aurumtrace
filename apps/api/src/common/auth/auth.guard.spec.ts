import type { ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import type { RequestWithPrincipal } from "../principal";

const DEMO_TENANT = "00000000-0000-0000-0000-0000000000a1";

function contextFor(req: Partial<RequestWithPrincipal>): {
  ctx: ExecutionContext;
  req: RequestWithPrincipal;
} {
  const full = { headers: {}, ...req } as RequestWithPrincipal;
  const ctx = {
    switchToHttp: () => ({ getRequest: () => full }),
  } as unknown as ExecutionContext;
  return { ctx, req: full };
}

describe("AuthGuard — DEMO_MODE", () => {
  const original = process.env;
  afterEach(() => {
    process.env = original;
    jest.resetModules();
  });

  it("resolves the fixed demo principal with no token or headers", async () => {
    process.env = {
      ...original,
      DATABASE_URL: "postgres://x",
      SUPABASE_JWT_SECRET: "y",
      DB_APP_ROLE: "authenticated",
      DEMO_MODE: "true",
      DEMO_TENANT_ID: DEMO_TENANT,
    };
    // Fresh module so loadEnv re-reads the env above.
    const { AuthGuard: FreshGuard } =
      require("./auth.guard") as typeof import("./auth.guard");
    const guard = new (FreshGuard as typeof AuthGuard)();

    const { ctx, req } = contextFor({ headers: {} });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.principal).toEqual({
      userId: "00000000-0000-0000-0000-0000000d3110",
      tenantId: DEMO_TENANT,
      role: "compliance_officer",
    });
  });
});
