-- grants.sql — base table privileges for the `authenticated` role.
--
-- The API connects as the Supabase `postgres`/pooler user, then `SET LOCAL ROLE
-- authenticated` per request. `authenticated` is NOBYPASSRLS, so RLS restricts
-- every row to the request's tenant. These grants give the role table access;
-- RLS does the isolating. UPDATE/DELETE on audit_entries stay UNGRANTED (the log
-- is append-only; migration 0003 also revokes them), so history cannot be edited.
--
-- Supabase usually auto-grants public tables to `authenticated` via default
-- privileges; this file makes it explicit and independent of that default.

grant usage on schema public, app to authenticated;
grant select on public.tenants, public.memberships to authenticated;
grant select, insert on public.audit_entries to authenticated;
grant select, insert, update on
  public.customers, public.cases, public.items, public.screening_results,
  public.sourcing_records, public.reports, public.documents to authenticated;
