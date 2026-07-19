# AurumTrace — Phase 1 Build Plan for Claude Code

A concrete plan to build the pilot MVP with Claude Code: how to drive it, the repo
structure, the sub-agents to set up, and the order to generate the modules.

> **Scope:** Phase 1 from the scope doc — auth/tenancy/RLS + the six modules + dashboard.
> **Posture:** this is a *regulated* product. Several steps below have a **human review
> gate** (marked 🔒). Claude Code drafts; a human reviews and owns the compliance,
> security and goAML-mapping decisions. Nothing auto-files.

---

## 0. How to drive Claude Code on this project

1. **Put `CLAUDE.md` at the repo root** (sample below). Claude Code reads it automatically
   as project rules on every run — stack, conventions, and the non-negotiable guardrails.
2. **Work in vertical slices, not layers.** Build one module end-to-end (DB → API →
   integration → UI → tests) before the next, so each is demoable to your design partners.
3. **Use sub-agents for focused jobs** (`.claude/agents/`, below). Keep the main thread as
   the orchestrator that hands work to them.
4. **Respect the review gates (🔒).** When a step touches compliance logic, the goAML
   output, RLS, or PII, stop and review before moving on. Don't let a long agent run
   blow past these.
5. **Keep regulatory truth in one place.** All goAML field rules, thresholds and retention
   come from the advisor-approved mapping doc — never hard-coded from memory. Tag anything
   unverified `// TODO(compliance): verify`.

---

## 1. Repository structure (pnpm + Turborepo monorepo)

```
aurumtrace/
├─ CLAUDE.md                      # project rules (Claude Code reads this)
├─ pnpm-workspace.yaml
├─ turbo.json
├─ .claude/
│  └─ agents/                     # sub-agents (section 3)
│     ├─ db-schema.md
│     ├─ backend-module.md
│     ├─ frontend-module.md
│     ├─ integrations.md
│     ├─ compliance-logic.md
│     ├─ test-writer.md
│     └─ reviewer.md
├─ apps/
│  ├─ web/                        # Next.js (App Router) + TS + Tailwind + shadcn/ui
│  │  ├─ app/
│  │  │  ├─ (auth)/sign-in/
│  │  │  ├─ (app)/dashboard/
│  │  │  ├─ (app)/cases/[id]/     # the six-stage wizard lives here
│  │  │  ├─ (app)/customers/
│  │  │  ├─ (app)/reports/
│  │  │  ├─ (app)/audit/
│  │  │  └─ layout.tsx
│  │  ├─ components/              # brand components + shadcn/ui
│  │  ├─ lib/                     # api client, auth, i18n
│  │  ├─ messages/                # en.json (full), ar.json (stubbed keys)
│  │  └─ styles/tokens.css        # from Phase 0 (brand tokens)
│  └─ api/                        # NestJS + TS
│     ├─ src/
│     │  ├─ main.ts
│     │  ├─ common/               # guards, tenant context, RLS, error filter, audit hook
│     │  ├─ auth/                 # Supabase Auth + MFA
│     │  ├─ tenancy/              # tenant resolution
│     │  ├─ customers/
│     │  ├─ cases/                # orchestrates the pipeline
│     │  ├─ intake/               # Module 1
│     │  ├─ screening/            # Module 2
│     │  ├─ threshold/            # Module 3  (pure aggregation engine)
│     │  ├─ sourcing/             # Module 4
│     │  ├─ reporting/            # Module 5  (goAML XML builder)
│     │  └─ audit/                # Module 6  (hash-chained log)
│     └─ test/
├─ packages/
│  ├─ shared/                     # Zod schemas + TS types shared web <-> api
│  │  └─ src/                     # customer.ts, case.ts, money.ts, goaml.ts ...
│  ├─ db/                         # Supabase migrations, RLS policies, seed
│  │  ├─ migrations/
│  │  └─ policies/
│  └─ integrations/               # provider adapters behind clean interfaces
│     └─ src/ocr/  screening/  goldprice/  llm/
└─ docs/
   ├─ goaml-mapping.md            # advisor-approved field mapping (source of truth)
   └─ sample-reports/             # golden-file fixtures for report tests
```

**Why this shape:** `packages/shared` lets the API and web reuse the *same* Zod schema for
every regulated field (one definition, validated on both sides). `packages/integrations`
keeps OCR/screening/price/LLM behind interfaces so providers can be swapped after the
bake-off. `packages/db` keeps RLS policies versioned with the schema. Collapse to a single
app only if the team finds the monorepo heavy.

---

## 2. Sample `CLAUDE.md` (repo root)

```md
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
```

---

## 3. Sub-agents (`.claude/agents/*.md`)

Each file is a focused specialist. Format: YAML frontmatter (`name`, `description`,
optional `tools`) then the system prompt. *(Confirm the current frontmatter fields in the
Claude Code docs — keep the bodies below as the substance.)*

**`db-schema`** — owns `packages/db`.
- Writes migrations and **RLS policies** keyed by tenant; seed data. Designs the schema
  from `packages/shared` types. Never lets a table holding PII exist without an RLS policy.
- Guardrail: every new table ships with its policy and a seed in the same change.

**`backend-module`** — owns NestJS feature modules in `apps/api`.
- Builds controllers/services/DTOs per module, wired to `cases` orchestration, validating
  with shared Zod schemas; calls the audit hook on every state change.
- Guardrail: no business/regulatory math here — that lives in `compliance-logic`.

**`frontend-module`** — owns `apps/web` screens.
- Builds screens with shadcn/ui against `tokens.css`/`brand.md`; EN strings in `messages/`,
  AR keys stubbed; RTL-safe; AA contrast. Implements the six-stage wizard + dashboard.
- Guardrail: presentation only; all decisions come from the API.

**`integrations`** — owns `packages/integrations`.
- Defines adapter **interfaces** (OCR, screening, gold price, LLM) with mock + real impls;
  retries/timeouts; no provider lock-in leaking upward.
- Guardrail: never send raw PII to an LLM/provider without the data-handling flag set.

**`compliance-logic`** — owns the regulated core (threshold/aggregation, risk scoring,
goAML XML builder). 🔒 **Human-review every output.**
- Pure, well-tested functions driven by `docs/goaml-mapping.md`. Explains every rule in
  comments with a source reference.
- Guardrail: no value without a mapping source; flags unknowns rather than guessing.

**`test-writer`** — owns tests, especially for compliance modules.
- Unit tests for threshold/aggregation/risk; **golden-file tests** for goAML XML against
  `docs/sample-reports/`; hash-chain integrity tests; one e2e happy-path case.

**`reviewer`** — read-mostly security/quality reviewer.
- Checks RLS coverage, tenant scoping, PII handling, secrets, and that no auto-file path
  exists. Run it before each review gate.

---

## 4. Build order (the sequence to generate modules)

Reordered from the scope doc to follow **dependency and risk**, not the UI's visual order.
Rationale notes call out the deviations.

**Step 0 — goAML mapping spike** 🔒 *(lead: compliance-logic + you + advisor)*
Produce `docs/goaml-mapping.md` and a couple of `docs/sample-reports/` fixtures, confirmed
with the compliance advisor. Build a throwaway end-to-end slice with everything stubbed to
prove the shape. **Why first:** the report mapping is the biggest unknown and it shapes the
data model — de-risk it before building anything real.

**Step 1 — Foundations** *(db-schema, backend-module, frontend-module)*
Monorepo scaffold; Next.js + Nest + shared package; Supabase project; **Supabase Auth + MFA**;
**tenancy + RLS** base; app shell, sign-in (dark), dashboard skeleton; and the **audit-log
primitive** (append-only, hash-chained writer) as a core service. **Why audit now:** every
later module must write to it from the first line of code, not have it retrofitted.

**Step 2 — Data model + RLS** 🔒 *(db-schema; reviewer gate on RLS)*
All core tables (Tenant, User, Customer, Item, Case, ScreeningResult, SourcingRecord,
Report, AuditEntry, Document) with policies and seed.

**Step 3 — Integrations skeleton** *(integrations)*
Adapter interfaces + mocks for all four providers; implement the **gold-price** one for real
first (lowest risk, no PII). OCR/screening/LLM stay mocked until their modules.

**Step 4 — Module 1: Intake (first real vertical slice)** *(backend + frontend + integrations)*
Customer + item capture, OCR adapter (mock → real), live valuation, case creation. End-to-end
and demoable.

**Step 5 — Module 3: Threshold + aggregation engine** 🔒 *(compliance-logic + test-writer)*
Pure AED 55,000 test + linked-transaction aggregation, fully unit-tested, then wired into the
case. **Why before KYC:** it's pure logic, low-dependency, high-value, and it settles the
"reportable" decision the rest of the flow hinges on.

**Step 6 — Module 2: KYC / CDD** *(integrations + compliance-logic + frontend)*
Screening adapter (OpenSanctions for pilot) + risk-scoring rules (tested) + results UI.

**Step 7 — Module 4: Responsible sourcing** *(backend + frontend)*
Source declaration, OECD five-step checklist, document upload, sourcing-risk rating.

**Step 8 — Module 5: goAML report** 🔒 *(compliance-logic + integrations + frontend + test-writer)*
XML builder from the approved mapping + schema validation + LLM-drafted narrative
(human-in-the-loop) + **review/approve UI**; manual upload to goAML. Golden-file tests against
the Step 0 fixtures. **Strictest gate — never auto-file.**

**Step 9 — Module 6: Audit view + integrity** 🔒 *(backend + compliance-logic + test-writer)*
Case timeline UI, retrieval/search, and a chain-integrity verifier over the log the earlier
steps have been writing.

**Step 10 — Dashboard + case list/search** *(frontend)*
Finalise KPIs, case list, search/filter; confirm EN strings; ensure AR keys exist (stubbed).

**Step 11 — Hardening pass** 🔒 *(reviewer + test-writer)*
One real case run end-to-end; security review (RLS, PII, secrets, no auto-file path); test
coverage on all compliance modules; deploy to the in-region pilot environment.

---

## 5. Review gates & guardrails (don't skip)

- 🔒 **RLS / tenancy** (Steps 1–2): prove no query crosses tenants before any real data.
- 🔒 **Compliance logic** (Steps 5, 6, 8): a human reads every threshold, risk and goAML rule
  against `docs/goaml-mapping.md`. Tests must pass.
- 🔒 **goAML output** (Step 8): the generated XML matches the advisor-approved sample fixtures.
- 🔒 **Security/PII** (Step 11): no PII in logs; secrets in a vault; encryption on; in-region.
- **Always:** no path that submits a report without a human clicking "file".

---

## 6. Testing approach
- **Mandatory unit tests:** threshold + aggregation, risk scoring, goAML XML builder,
  hash-chain integrity.
- **Golden-file tests:** generated goAML XML diffed against `docs/sample-reports/`.
- **One e2e happy path:** intake → ... → drafted report → audit entry present.
- Keep compliance tests fast and deterministic so they run on every change.

---

## 7. Definition of done — Phase 1
A design-partner dealer can run a real (non-production-critical) case through all six stages
and:
- intake auto-values the item against the live price;
- screening + risk score complete;
- threshold + linked-transaction aggregation correctly flags reportability;
- sourcing is captured;
- a **valid goAML XML draft** is generated and presented for human review and manual filing;
- a complete, tamper-evident **audit trail** exists for the case;
- English UI throughout (Arabic keys stubbed); deployed to an **in-region** pilot environment;
- compliance modules covered by passing tests.

---

*Drive this with Claude Code one step at a time, pausing at every 🔒. The tool will write
most of it; you and your compliance advisor own the regulated decisions and the reviews.*
