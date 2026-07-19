-- seed.sql — a single demo tenant for local development.
-- NOTE: memberships reference auth.users ids. After creating a user in Supabase
-- Auth, insert a membership row mapping that user to this tenant. Replace the
-- placeholder uuid below with the real auth user id (or use the helper at the bottom).

insert into public.tenants (id, legal_name, licence_authority, licence_no, goaml_org_id)
values (
  '00000000-0000-0000-0000-0000000000a1',
  'Al Noor Gold Trading LLC',
  'DMCC',
  'DMCC-7741',
  'UAE-FIU-44821'
)
on conflict (id) do nothing;

-- Example membership (fill in a real auth.users id):
-- insert into public.memberships (user_id, tenant_id, role)
-- values ('<auth-user-uuid>', '00000000-0000-0000-0000-0000000000a1', 'compliance_officer')
-- on conflict do nothing;

-- Demo customer + case (fictional data, mirrors docs/design).
insert into public.customers
  (id, tenant_id, full_name, emirates_id, nationality, residency_status, risk_rating)
values (
  '00000000-0000-0000-0000-0000000000c1',
  '00000000-0000-0000-0000-0000000000a1',
  'Rashid Al Maktoum', '784-1987-3456712-9', 'UAE', 'resident', 'medium'
)
on conflict (id) do nothing;

insert into public.cases
  (id, tenant_id, reference, customer_id, stage, status, aggregate_value_fils)
values (
  '00000000-0000-0000-0000-00000000ca01',
  '00000000-0000-0000-0000-0000000000a1',
  'AT-2026-000148',
  '00000000-0000-0000-0000-0000000000c1',
  3, 'reportable', 9140000
)
on conflict (id) do nothing;
