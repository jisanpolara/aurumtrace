-- 0002_rls.sql — Row-Level Security. Tenant isolation is enforced HERE, in the
-- database, not in application code (CLAUDE.md). Every policy keys on
-- app.current_tenant_id(); when it is NULL the policies return no rows (fail closed).
--
-- FORCE ensures even the table owner is subject to RLS, so a mis-scoped query
-- from any role cannot cross tenants. The apps/api connection role must NOT have
-- BYPASSRLS.

alter table public.tenants        enable row level security;
alter table public.tenants        force  row level security;
alter table public.memberships    enable row level security;
alter table public.memberships    force  row level security;
alter table public.audit_entries  enable row level security;
alter table public.audit_entries  force  row level security;

-- ---- tenants: a member can see only their own tenant --------------------
drop policy if exists tenants_select on public.tenants;
create policy tenants_select on public.tenants
  for select
  using (id = app.current_tenant_id());

-- ---- memberships: scoped to the active tenant ---------------------------
drop policy if exists memberships_select on public.memberships;
create policy memberships_select on public.memberships
  for select
  using (tenant_id = app.current_tenant_id());

-- ---- audit_entries: read within tenant; insert only within tenant -------
drop policy if exists audit_select on public.audit_entries;
create policy audit_select on public.audit_entries
  for select
  using (tenant_id = app.current_tenant_id());

drop policy if exists audit_insert on public.audit_entries;
create policy audit_insert on public.audit_entries
  for insert
  with check (tenant_id = app.current_tenant_id());

-- No UPDATE or DELETE policy exists => those commands are denied for all
-- non-owner roles. Append-only is hardened further in 0003.
