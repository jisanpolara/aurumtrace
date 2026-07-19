-- 0003_audit_append_only.sql — Defense-in-depth for the audit log.
-- RLS already denies UPDATE/DELETE (no policy). This adds two more layers so the
-- log is tamper-evident even if a policy is later mis-added or a privileged role
-- is used: an explicit privilege revoke, and a trigger that hard-blocks mutation.

revoke update, delete on public.audit_entries from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke update, delete on public.audit_entries from authenticated;
  end if;
end $$;

create or replace function app.forbid_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_entries is append-only (% denied)', tg_op
    using errcode = 'check_violation';
end;
$$;

drop trigger if exists audit_entries_no_update on public.audit_entries;
create trigger audit_entries_no_update
  before update on public.audit_entries
  for each row execute function app.forbid_audit_mutation();

drop trigger if exists audit_entries_no_delete on public.audit_entries;
create trigger audit_entries_no_delete
  before delete on public.audit_entries
  for each row execute function app.forbid_audit_mutation();
