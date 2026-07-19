import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DB_APP_ROLE: z.string().min(1).default("authenticated"),
  SUPABASE_JWT_SECRET: z.string().min(1),
  AUTH_DEV_MODE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  PORT: z.coerce.number().int().positive().default(3001),

  // DEMO_MODE — hosted, open (no-login) demo. Every request resolves to a
  // single fixed demo tenant/principal; RLS still scopes all data to that
  // tenant. This is NOT a login path and must be OFF for a real pilot. It is
  // deliberately separate from AUTH_DEV_MODE (which trusts x-debug-* headers).
  DEMO_MODE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  DEMO_TENANT_ID: z.string().uuid().optional(),
  DEMO_USER_ID: z
    .string()
    .uuid()
    .default("00000000-0000-0000-0000-0000000d3110"),
  DEMO_ROLE: z.string().min(1).default("compliance_officer"),

  // Optional integrations/secrets — validated for shape when present so a
  // malformed value fails fast at boot. Consumers still read these directly.
  DOCUMENTS_ENC_KEY: z.string().min(1).optional(),
  GOLD_PRICE_URL: z.string().url().optional(),
  SCREENING_URL: z.string().url().optional(),
  SCREENING_API_KEY: z.string().min(1).optional(),
  // Advisor-confirmed reporting policy (provisional fallback used when unset).
  DPMS_THRESHOLD_FILS: z.coerce.number().int().positive().optional(),
  DPMS_AGG_WINDOW_DAYS: z.coerce.number().int().positive().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

/** Parse and cache process.env once. Throws (fails fast) on invalid config. */
export function loadEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }
  // Fail closed: dev-mode auth (x-debug-* headers) must never run in production.
  if (process.env.NODE_ENV === "production" && parsed.data.AUTH_DEV_MODE) {
    throw new Error("AUTH_DEV_MODE must be off in production");
  }
  // The two non-JWT auth modes are mutually exclusive — never run both.
  if (parsed.data.AUTH_DEV_MODE && parsed.data.DEMO_MODE) {
    throw new Error("AUTH_DEV_MODE and DEMO_MODE cannot both be enabled");
  }
  // DEMO_MODE binds every request to one tenant, so that tenant must be named.
  if (parsed.data.DEMO_MODE && !parsed.data.DEMO_TENANT_ID) {
    throw new Error("DEMO_MODE requires DEMO_TENANT_ID (the demo tenant uuid)");
  }
  cached = parsed.data;
  return cached;
}
