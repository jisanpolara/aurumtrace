# @aurumtrace/db

Postgres schema, **Row-Level Security**, and the append-only audit table for AurumTrace.

## Layout
- `migrations/0001_init.sql` — `tenants`, `memberships`, `audit_entries`, and the `app.current_tenant_id()` / `app.current_user_id()` helpers.
- `migrations/0002_rls.sql` — RLS: every table `ENABLE` + `FORCE` row level security; tenant-scoped policies that **fail closed** when no tenant claim is set.
- `migrations/0003_audit_append_only.sql` — revokes `UPDATE`/`DELETE` and adds trigger guards so the audit log is tamper-evident.
- `seed.sql` — one demo tenant (Al Noor Gold Trading LLC).

## How tenant isolation works
RLS policies key on `app.current_tenant_id()`, which reads `request.jwt.claims ->> 'tenant_id'`.
The claim is set per request by:
- **Supabase PostgREST** automatically, or
- **apps/api**, which opens a transaction and runs `set_config('request.jwt.claims', '<json>', true)` before any query (see `apps/api/src/common/db`).

Because tables use `FORCE ROW LEVEL SECURITY`, the policies apply even to the table owner. **The apps/api connection role must not have `BYPASSRLS`.**

## Applying (local Postgres)
```bash
export DATABASE_URL=postgres://...
pnpm --filter @aurumtrace/db migrate:local
pnpm --filter @aurumtrace/db seed:local
```
On Supabase, apply via `supabase db push` or the SQL editor in migration order.

## 🔒 Review gate
This is regulated infrastructure. RLS coverage and the append-only guarantees must be
reviewed (reviewer agent + compliance/security owner) before any real tenant data lands.
Live RLS behaviour must be proven with the cross-tenant tests (see `apps/api` tests and
the planned pgTAP/integration suite) against a real Postgres — it cannot be verified by
static review alone.
