import type { ExecutionContext } from "@nestjs/common";
import { SignJWT } from "jose";
import { AuthGuard } from "./auth.guard";
import type { RequestWithPrincipal } from "../principal";

const DEMO_TENANT = "00000000-0000-0000-0000-0000000000a1";
const TENANT = "00000000-0000-0000-0000-0000000000a1";
const USER = "11111111-1111-1111-1111-111111111111";

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

describe("AuthGuard — Bearer (HS256) with custom claims", () => {
  const original = process.env;
  const SECRET = "test-hs256-secret-please-ignore";
  const key = new TextEncoder().encode(SECRET);

  afterEach(() => {
    process.env = original;
    jest.resetModules();
  });

  function freshGuard() {
    process.env = {
      ...original,
      NODE_ENV: "test",
      DATABASE_URL: "postgres://x",
      DB_APP_ROLE: "authenticated",
      SUPABASE_JWT_SECRET: SECRET,
      DEMO_MODE: "false",
      AUTH_DEV_MODE: "false",
    };
    const { AuthGuard: FreshGuard } =
      require("./auth.guard") as typeof import("./auth.guard");
    return new (FreshGuard as typeof AuthGuard)();
  }

  async function token(claims: Record<string, unknown>): Promise<string> {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(USER)
      .setExpirationTime("1h")
      .sign(key);
  }

  it("resolves the principal from tenant_id + app_role claims", async () => {
    const guard = freshGuard();
    const jwt = await token({ tenant_id: TENANT, app_role: "compliance_officer" });
    const { ctx, req } = contextFor({ headers: { authorization: `Bearer ${jwt}` } });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.principal).toEqual({ userId: USER, tenantId: TENANT, role: "compliance_officer" });
  });

  it("ignores the reserved top-level `role` claim (uses app_role only)", async () => {
    const guard = freshGuard();
    // Supabase sets role='authenticated'; that must NOT become our app role.
    const jwt = await token({ tenant_id: TENANT, role: "authenticated", app_role: "owner" });
    const { ctx, req } = contextFor({ headers: { authorization: `Bearer ${jwt}` } });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.principal?.role).toBe("owner");
  });

  it("rejects a token whose app_role is not a valid tenant role", async () => {
    const guard = freshGuard();
    const jwt = await token({ tenant_id: TENANT, app_role: "authenticated" });
    const { ctx } = contextFor({ headers: { authorization: `Bearer ${jwt}` } });
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });

  it("rejects a token signed with the wrong secret", async () => {
    const guard = freshGuard();
    const badJwt = await new SignJWT({ tenant_id: TENANT, app_role: "owner" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(USER)
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("a-different-secret"));
    const { ctx } = contextFor({ headers: { authorization: `Bearer ${badJwt}` } });
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });

  it("rejects when no Authorization header is present", async () => {
    const guard = freshGuard();
    const { ctx } = contextFor({ headers: {} });
    await expect(guard.canActivate(ctx)).rejects.toThrow();
  });
});
