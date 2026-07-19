-- 0006_audit_case_id.sql — add a queryable case dimension to the audit log,
-- so a per-case timeline can be retrieved (Step 9 / Module 6).
--
-- NOTE on integrity: case_id is denormalised QUERY metadata, set once at insert
-- and never changed (audit_entries is append-only — RLS denies UPDATE/DELETE and
-- the 0003 trigger blocks mutation even for a superuser). It is intentionally
-- NOT part of the hashed core (packages/shared/audit.ts), because the hash
-- already covers the immutable record and the row itself cannot be altered after
-- insert, so case_id cannot be tampered without breaking append-only.

alter table public.audit_entries add column if not exists case_id uuid;

create index if not exists audit_entries_case_idx
  on public.audit_entries(tenant_id, case_id);
