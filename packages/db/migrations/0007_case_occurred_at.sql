-- 0007_case_occurred_at.sql — the transaction-occurrence date for a case.
--
-- The reporting-threshold aggregation window must anchor on when the transaction
-- OCCURRED, not when the record was created. This adds an explicit column
-- (defaulting to now() so existing rows + counter intake without an explicit
-- date still work), which intake can set to the real transaction date.
-- Resolves the TODO(compliance) anchor caveat in apps/api threshold.service.

alter table public.cases add column if not exists occurred_at timestamptz not null default now();
