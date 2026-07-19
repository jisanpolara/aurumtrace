# AurumTrace — project rules

AI compliance app for UAE gold dealers. Regulated product — correctness and
auditability outrank speed.

## Stack
pnpm + Turborepo. apps/web = Next.js (App Router, TS, Tailwind, shadcn/ui).
apps/api = NestJS (TS). packages/shared = Zod + types. packages/db = Supabase
(Postgres) migrations + RLS. packages/integrations = provider adapters.

## Conventions
- TypeScript strict; no `any`. Validate every external/boundary input with Zod
  from packages/shared.
- Money: store and compute in integer minor units (fils); never use floats for AED.
- Errors: typed; never swallow. No PII in logs or error messages.
- Commits: conventional commits; one module per slice.

## Non-negotiable guardrails
- Multi-tenant: every query is tenant-scoped; RLS is the enforcement layer, not app code.
- Never auto-submit a goAML report. The flow ends at a human "review & file" step.
- All goAML fields, thresholds and retention come from docs/goaml-mapping.md
  (advisor-approved). Do not invent regulatory values; tag gaps // TODO(compliance).
- Compliance logic (threshold, aggregation, risk scoring, goAML builder) MUST have
  unit tests before it is considered done.
- The audit log is append-only and hash-chained; no updates or deletes of audit rows.