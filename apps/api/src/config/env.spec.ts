const BASE = {
  DATABASE_URL: "postgres://x",
  SUPABASE_JWT_SECRET: "y",
  DB_APP_ROLE: "authenticated",
};

describe("loadEnv — AUTH_DEV_MODE production guard", () => {
  const original = process.env;
  afterEach(() => {
    process.env = original;
  });

  it("throws when AUTH_DEV_MODE=true in production (fail closed)", () => {
    jest.isolateModules(() => {
      process.env = { ...original, ...BASE, NODE_ENV: "production", AUTH_DEV_MODE: "true" };
      const { loadEnv } = require("./env") as typeof import("./env");
      expect(() => loadEnv()).toThrow(/AUTH_DEV_MODE must be off in production/);
    });
  });

  it("allows AUTH_DEV_MODE=true outside production (dev/test)", () => {
    jest.isolateModules(() => {
      process.env = { ...original, ...BASE, NODE_ENV: "test", AUTH_DEV_MODE: "true" };
      const { loadEnv } = require("./env") as typeof import("./env");
      expect(loadEnv().AUTH_DEV_MODE).toBe(true);
    });
  });

  it("allows AUTH_DEV_MODE off in production", () => {
    jest.isolateModules(() => {
      process.env = { ...original, ...BASE, NODE_ENV: "production", AUTH_DEV_MODE: "false" };
      const { loadEnv } = require("./env") as typeof import("./env");
      expect(loadEnv().AUTH_DEV_MODE).toBe(false);
    });
  });
});

describe("loadEnv — DEMO_MODE", () => {
  const original = process.env;
  const DEMO_TENANT = "00000000-0000-0000-0000-0000000000a1";
  afterEach(() => {
    process.env = original;
  });

  it("requires DEMO_TENANT_ID when DEMO_MODE is on", () => {
    jest.isolateModules(() => {
      process.env = { ...original, ...BASE, DEMO_MODE: "true" };
      delete process.env.DEMO_TENANT_ID;
      const { loadEnv } = require("./env") as typeof import("./env");
      expect(() => loadEnv()).toThrow(/DEMO_MODE requires DEMO_TENANT_ID/);
    });
  });

  it("rejects DEMO_MODE and AUTH_DEV_MODE both enabled", () => {
    jest.isolateModules(() => {
      process.env = {
        ...original,
        ...BASE,
        NODE_ENV: "test",
        DEMO_MODE: "true",
        AUTH_DEV_MODE: "true",
        DEMO_TENANT_ID: DEMO_TENANT,
      };
      const { loadEnv } = require("./env") as typeof import("./env");
      expect(() => loadEnv()).toThrow(/cannot both be enabled/);
    });
  });

  it("is allowed in production with a demo tenant (it is not a login path)", () => {
    jest.isolateModules(() => {
      process.env = {
        ...original,
        ...BASE,
        NODE_ENV: "production",
        DEMO_MODE: "true",
        DEMO_TENANT_ID: DEMO_TENANT,
      };
      const { loadEnv } = require("./env") as typeof import("./env");
      const env = loadEnv();
      expect(env.DEMO_MODE).toBe(true);
      expect(env.DEMO_TENANT_ID).toBe(DEMO_TENANT);
      expect(env.DEMO_ROLE).toBe("compliance_officer");
    });
  });
});

describe("loadEnv — real-auth verification config", () => {
  const original = process.env;
  const NO_AUTH = { DATABASE_URL: "postgres://x", DB_APP_ROLE: "authenticated" };
  afterEach(() => {
    process.env = original;
  });

  it("throws when real auth has neither JWKS URL nor JWT secret", () => {
    jest.isolateModules(() => {
      process.env = { ...original, ...NO_AUTH, NODE_ENV: "production" };
      delete process.env.SUPABASE_JWT_SECRET;
      delete process.env.SUPABASE_JWKS_URL;
      const { loadEnv } = require("./env") as typeof import("./env");
      expect(() => loadEnv()).toThrow(/SUPABASE_JWKS_URL.*SUPABASE_JWT_SECRET/);
    });
  });

  it("accepts a JWKS URL alone (asymmetric keys, no shared secret)", () => {
    jest.isolateModules(() => {
      process.env = {
        ...original,
        ...NO_AUTH,
        NODE_ENV: "production",
        SUPABASE_JWKS_URL: "https://ref.supabase.co/auth/v1/.well-known/jwks.json",
      };
      delete process.env.SUPABASE_JWT_SECRET;
      const { loadEnv } = require("./env") as typeof import("./env");
      expect(loadEnv().SUPABASE_JWKS_URL).toContain("jwks.json");
    });
  });
});
