-- 0005_domain_rls.sql — RLS for all domain tables (Step 2).
-- Same posture as 0002: ENABLE + FORCE, tenant-scoped, fail-closed. Writes
-- additionally require a non-auditor role (auditor is read-only). No DELETE
-- policy => deletes are denied for a conservative, compliance-friendly default.

do $$
declare
  t text;
  domain_tables text[] := array[
    'customers','cases','items','screening_results',
    'sourcing_records','reports','documents'
  ];
begin
  foreach t in array domain_tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force  row level security', t);

    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format(
      'create policy %I on public.%I for select using (tenant_id = app.current_tenant_id())',
      t || '_select', t);

    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format(
      'create policy %I on public.%I for insert with check (' ||
        'tenant_id = app.current_tenant_id() ' ||
        'and app.current_actor_role() is distinct from ''auditor'')',
      t || '_insert', t);

    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format(
      'create policy %I on public.%I for update ' ||
        'using (tenant_id = app.current_tenant_id() ' ||
              'and app.current_actor_role() is distinct from ''auditor'') ' ||
        'with check (tenant_id = app.current_tenant_id() ' ||
              'and app.current_actor_role() is distinct from ''auditor'')',
      t || '_update', t);
  end loop;
end $$;
