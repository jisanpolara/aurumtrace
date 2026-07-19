# AurumTrace — Phase 1 Pilot Readiness (Step 11 hardening)

Status of the Phase 1 build and the checklist to deploy to the **in-region pilot**.
The application code is built and verified; deployment requires the infra + advisor
sign-offs below. **Nothing in this system files a goAML report automatically** — the
flow always ends at an explicit human "review & file" action.

## What is built & verified (Steps 1–10)
- **Foundations** — pnpm/Turbo monorepo; `apps/web` (Next 14, App Router, RTL, EN + AR),
  `apps/api` (NestJS), `packages/shared` (Zod, money in **integer fils**), `packages/db`
  (Postgres migrations + RLS), `packages/integrations` (provider adapters).
- **Tenancy + RLS** — every table `ENABLE`+`FORCE` RLS, tenant-scoped, **fail-closed**;
  composite FKs prevent cross-tenant child rows. Proven by `packages/db` integration tests.
- **Audit** — append-only, hash-chained, tamper-evident (RLS + revoke + trigger); per-case
  timeline + chain-integrity verifier.
- **Pipeline** — intake (OCR + live valuation) → threshold/aggregation → KYC screening +
  risk scoring → responsible sourcing (+ AES-256-GCM encrypted documents) → goAML DPMSR
  draft (provisional) + human file. All tenant-isolated and audited.
- **Tests** — `apps/api` 64 unit/e2e (incl. compliance engines + golden-file goAML + no-auto-file),
  `packages/db` 17 RLS/audit, `packages/integrations` 18. Strict TypeScript, no `any`.
  Prod build excludes all test/dev artifacts.

## 🔒 Deploy prerequisites (must be done for the pilot)

### Infrastructure
- [ ] **Supabase project in an in-region (UAE) location**; enable encryption at rest, in-transit TLS.
- [ ] Apply migrations in order: `0001` → `0006` (`packages/db/migrations`), then `seed.sql` (demo only — not for real tenants).
- [ ] Create a dedicated **app DB role that does NOT have `BYPASSRLS`** and is not a superuser; point `DATABASE_URL` at it. (RLS is the isolation layer; a BYPASSRLS role would defeat it.)
- [ ] Set secrets via the platform secret store (never committed): `SUPABASE_JWT_SECRET`, `DATABASE_URL`, `DOCUMENTS_ENC_KEY` (32-byte, **KMS-managed**), provider keys.
- [ ] **`AUTH_DEV_MODE=false`** in every deployed environment (it accepts `x-debug-*` headers when true — dev only).
- [ ] Document storage: replace the local `LocalEncryptedStore` with object storage (Supabase Storage / S3) using the same encrypt-before-store path + KMS key.

### Wiring (currently stubbed/mocked)
- [ ] Wire **web → real Supabase Auth + MFA** (replaces the `at_session` dev cookie); attach the user's JWT to API calls.
- [ ] Provision the **`tenant_id` + `role` JWT claims** from membership at login (Supabase auth hook / app_metadata).
- [ ] Swap mock adapters for real providers: **OCR** (document AI), **screening** (OpenSanctions), **LLM** (narrative), **gold price** (set `GOLD_PRICE_URL` / `SCREENING_URL`).

### 🔒 Compliance advisor sign-offs (regulated values — currently flagged PROVISIONAL)
- [ ] **DPMS cash threshold + aggregation window** (`docs/goaml-mapping.md §2`) — set `DPMS_THRESHOLD_FILS` / `DPMS_AGG_WINDOW_DAYS`; until then determinations are flagged `provisional`.
- [ ] **goAML field mapping (§3) + official XSD** — replace the provisional DPMSR structure in `goaml-builder.ts`; switch `validateGoamlDraft` from structural to real XSD validation.
- [ ] **Risk-scoring weights/bands** (`risk-engine.ts`) and **sourcing rules** (`sourcing-risk.ts`) — MLRO calibration.
- [ ] Confirm the window anchors on **transaction date** (add `cases.occurred_at`; currently uses `created_at`).
- [ ] Retention rules for reports/documents.

## Pre-pilot security review (Step 11)
Verdict: **GO-WITH-CONDITIONS**. One blocker (B1) found and FIXED; conditions below are
ops/advisor responsibilities.
- **B1 (FIXED)** — `loadEnv` now throws if `AUTH_DEV_MODE=true` while `NODE_ENV=production`
  (`apps/api/src/config/env.ts`), tested in `env.spec.ts`. Dev/test unaffected.
- Conditions to confirm before pilot: **C1** DB role `NOBYPASSRLS`/non-superuser · **C2**
  advisor sign-off on `goaml-mapping.md` (threshold/window/risk/sourcing/mapping+XSD) ·
  **C3** secrets env-only · **C4** KMS for `DOCUMENTS_ENC_KEY` · **C5** real Supabase auth +
  claim provisioning · **C6** brief operators that in-app "file" is a decision record (manual FIU upload).

## Open watch-items (carry into the pilot)
- `AUTH_DEV_MODE` prod guard: **done** (B1).
- `cases.occurred_at` window anchor: **done** (migration 0007; intake accepts `occurredAt`; threshold aggregates on it). Advisor still confirms it's the right anchor.
- `provisional` flag on risk + sourcing results: **done** (surfaced in API + audit + KYC/sourcing UI).
- Env schema fail-fast validation for `DOCUMENTS_ENC_KEY` / provider URLs / `DPMS_*`: **done** (optional, validated in `loadEnv`).
- Dashboard KPI **subtext** is still static flavour text (the numbers are live).
- Case-wizard screens (kyc/sourcing/report/audit) use English literals; AR keys exist for list/dashboard surfaces — finish the i18n pass for full Arabic.
- Filing authority model: confirmed to `owner`/`compliance_officer`; verify against the regulator's expectation.

## End-to-end pilot acceptance (Phase 1 "definition of done")
A design-partner dealer can run a real case through all six stages: intake auto-values
against the live price; screening + risk complete; threshold + linked aggregation flags
reportability; sourcing captured; a **valid goAML XML draft** is generated and presented for
human review and manual filing; a complete tamper-evident audit trail exists; English UI
(Arabic stubbed); deployed in-region; compliance modules covered by passing tests.
