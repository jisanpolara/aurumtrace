-- 0004_domain_tables.sql — Phase 1 core domain model (Step 2).
-- Every table carries tenant_id and is RLS-scoped in 0005. Money is integer fils.
-- PII (customer identity, document bytes) lives here, protected by RLS, never logged.
--
-- Cross-tenant integrity: child tables reference parents by COMPOSITE key
-- (tenant_id, id), not id alone. Parents expose `unique (tenant_id, id)`. This
-- makes the FK itself reject a child whose tenant_id differs from its parent's,
-- so RLS (row visibility) and the FK (relational integrity) can't disagree.

-- Role of the current principal, from the verified JWT claim (for read-only auditor).
create or replace function app.current_actor_role()
returns text
language sql
stable
as $$
  -- Same blank-GUC guard as app.current_tenant_id() (see 0001_init.sql).
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '')
$$;

-- ---- Customers (PII) -----------------------------------------------------
create table if not exists public.customers (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete restrict,
  full_name         text not null,
  emirates_id       text,
  nationality       text,
  residency_status  text check (residency_status in ('resident','non_resident')),
  date_of_birth     date,
  id_expiry         date,
  risk_rating       text not null default 'unrated'
                    check (risk_rating in ('unrated','low','medium','high')),
  created_at        timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, emirates_id)
);
create index if not exists customers_tenant_idx on public.customers(tenant_id);

-- ---- Cases (the six-stage compliance flow) -------------------------------
create table if not exists public.cases (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete restrict,
  reference     text not null,
  customer_id   uuid,
  stage         smallint not null default 1 check (stage between 1 and 6),
  status        text not null default 'draft'
                check (status in ('draft','in_review','reportable','cleared','filed')),
  aggregate_value_fils bigint,
  created_by    uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, reference),
  foreign key (tenant_id, customer_id)
    references public.customers (tenant_id, id) on delete restrict
);
create index if not exists cases_tenant_idx on public.cases(tenant_id);
create index if not exists cases_customer_idx on public.cases(customer_id);

-- ---- Items (gold being transacted) ---------------------------------------
create table if not exists public.items (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants(id) on delete restrict,
  case_id             uuid not null,
  item_type           text not null check (item_type in ('bar','coins','jewellery','scrap','other')),
  purity_karat        smallint check (purity_karat between 1 and 24),
  weight_grams        numeric(12,3) not null check (weight_grams > 0),
  transaction_type    text not null check (transaction_type in ('buy_from_customer','sell_to_customer')),
  gold_price_fils_per_gram bigint,
  value_fils          bigint,
  created_at          timestamptz not null default now(),
  foreign key (tenant_id, case_id)
    references public.cases (tenant_id, id) on delete cascade
);
create index if not exists items_tenant_idx on public.items(tenant_id);
create index if not exists items_case_idx on public.items(case_id);

-- ---- Screening results (KYC/CDD outcomes) --------------------------------
create table if not exists public.screening_results (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants(id) on delete restrict,
  case_id          uuid not null,
  customer_id      uuid,
  run_at           timestamptz not null default now(),
  sanctions_match  boolean not null default false,
  pep_match        boolean not null default false,
  adverse_media    boolean not null default false,
  identity_verified boolean not null default false,
  risk_score       smallint check (risk_score between 0 and 100),
  risk_band        text check (risk_band in ('low','medium','high')),
  reasons          jsonb not null default '[]'::jsonb,
  foreign key (tenant_id, case_id)
    references public.cases (tenant_id, id) on delete cascade,
  foreign key (tenant_id, customer_id)
    references public.customers (tenant_id, id) on delete restrict
);
create index if not exists screening_tenant_idx on public.screening_results(tenant_id);
create index if not exists screening_case_idx on public.screening_results(case_id);

-- ---- Sourcing records (OECD due diligence) -------------------------------
create table if not exists public.sourcing_records (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants(id) on delete restrict,
  case_id          uuid not null,
  declaration_type text check (declaration_type in ('customer_owned','dealer_sourced','unknown')),
  oecd_steps       jsonb not null default '{}'::jsonb,
  sourcing_risk    text check (sourcing_risk in ('low','medium','high')),
  created_at       timestamptz not null default now(),
  foreign key (tenant_id, case_id)
    references public.cases (tenant_id, id) on delete cascade
);
create index if not exists sourcing_tenant_idx on public.sourcing_records(tenant_id);
create index if not exists sourcing_case_idx on public.sourcing_records(case_id);

-- ---- Reports (goAML filings — NEVER auto-filed) --------------------------
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete restrict,
  case_id     uuid not null,
  report_type text not null check (report_type in ('DPMSR','STR')),
  reference   text,
  status      text not null default 'draft'
              check (status in ('draft','pending_review','filed')),
  value_fils  bigint,
  narrative   text,
  goaml_xml   text,
  filed_at    timestamptz,   -- set only by an explicit human "file" action (Step 8)
  filed_by    uuid,
  created_at  timestamptz not null default now(),
  unique (tenant_id, reference),
  foreign key (tenant_id, case_id)
    references public.cases (tenant_id, id) on delete restrict
);
create index if not exists reports_tenant_idx on public.reports(tenant_id);
create index if not exists reports_case_idx on public.reports(case_id);

-- ---- Documents (metadata; bytes stored encrypted in object storage) ------
create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete restrict,
  case_id       uuid,
  kind          text not null check (kind in ('id_scan','source_declaration','supporting','other')),
  filename      text not null,
  storage_path  text not null,   -- reference only; bytes encrypted at rest (AES-256-GCM) by apps/api documents service
  content_hash  char(64),
  uploaded_by   uuid,
  uploaded_at   timestamptz not null default now(),
  foreign key (tenant_id, case_id)
    references public.cases (tenant_id, id) on delete cascade
);
create index if not exists documents_tenant_idx on public.documents(tenant_id);
create index if not exists documents_case_idx on public.documents(case_id);
