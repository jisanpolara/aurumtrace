-- 0001_init.sql — Foundations schema: tenancy + append-only audit log.
-- Target: Supabase Postgres. `user`/`actor` ids correspond to auth.users.id
-- (no hard FK to auth.users, so this also applies on a plain Postgres for review/test).

create extension if not exists pgcrypto;

-- Helper schema for tenant-context functions used by RLS policies.
create schema if not exists app;

-- Resolve the active tenant from the request JWT claims. Set per request by:
--   * Supabase PostgREST (request.jwt.claims), or
--   * apps/api, via: select set_config('request.jwt.claims', '<json>', true)
-- Returns NULL when unset, so policies fail closed (no rows).
-- NOTE: the raw claim is `nullif(...,'')` BEFORE the ::jsonb cast. After a
-- `SET LOCAL request.jwt.claims` transaction ends, Postgres reverts the custom
-- GUC to '' (not NULL) on a pooled connection; casting ''::jsonb would error
-- instead of failing closed. Guarding here keeps "no/blank claim => no rows".
create or replace function app.current_tenant_id()
returns uuid
language sql
stable
as $$
  select nullif(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'tenant_id',
    ''
  )::uuid
$$;

create or replace function app.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub',
    ''
  )::uuid
$$;

-- ---- Tenants -------------------------------------------------------------
create table if not exists public.tenants (
  id                uuid primary key default gen_random_uuid(),
  legal_name        text not null,
  licence_authority text not null,
  licence_no        text not null,
  goaml_org_id      text,
  created_at        timestamptz not null default now()
);

-- ---- Memberships (user <-> tenant <-> role) ------------------------------
create table if not exists public.memberships (
  user_id    uuid not null,                       -- auth.users.id
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  role       text not null check (role in ('owner','compliance_officer','staff','auditor')),
  created_at timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

create index if not exists memberships_tenant_idx on public.memberships(tenant_id);

-- ---- Audit entries (append-only, hash-chained) ---------------------------
-- One chain per tenant, ordered by `seq`. `prev_hash`/`hash` are computed by
-- the writer (apps/api) over the canonical core; see packages/shared/audit.ts.
create table if not exists public.audit_entries (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete restrict,
  seq           bigint not null,
  actor_id      uuid,                              -- null = system/AI event
  event         text not null,
  resource_type text,
  resource_id   uuid,
  payload       jsonb not null default '{}'::jsonb,
  prev_hash     char(64) not null,
  hash          char(64) not null,
  created_at    timestamptz not null default now(),
  unique (tenant_id, seq),
  unique (tenant_id, hash)
);

create index if not exists audit_entries_tenant_seq_idx
  on public.audit_entries(tenant_id, seq);
