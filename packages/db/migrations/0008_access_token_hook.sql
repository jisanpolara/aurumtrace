-- 0008_access_token_hook.sql
-- Supabase custom access-token hook: injects the user's tenant_id + app_role
-- (from public.memberships) into the JWT claims, so apps/api authorizes and sets
-- the RLS tenant context from the *verified* token — no unscoped bootstrap query.
--
-- We use `app_role` (not `role`): Supabase reserves the top-level `role` claim
-- for the Postgres role (`authenticated`), and overloading it would break RLS.
--
-- After deploying, enable the hook in the Supabase dashboard:
--   Authentication → Hooks → Custom Access Token → public.custom_access_token_hook
--
-- The role/grant statements are guarded so this migration also applies on plain
-- Postgres / PGlite (tests), where `supabase_auth_admin` does not exist.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  m record;
  claims jsonb;
begin
  select tenant_id, role
    into m
    from public.memberships
   where user_id = (event->>'user_id')::uuid
   order by created_at asc   -- primary (first) membership
   limit 1;

  claims := coalesce(event->'claims', '{}'::jsonb);
  if m.tenant_id is not null then
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(m.tenant_id::text));
    claims := jsonb_set(claims, '{app_role}',  to_jsonb(m.role));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Grant + read policy for the auth admin role (Supabase only).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    execute 'grant usage on schema public to supabase_auth_admin';
    execute 'grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin';
    execute 'grant select on public.memberships to supabase_auth_admin';
    -- Let the auth admin read memberships during token minting (SELECT only).
    execute 'drop policy if exists memberships_auth_admin_read on public.memberships';
    execute 'create policy memberships_auth_admin_read on public.memberships '
         || 'for select to supabase_auth_admin using (true)';
  end if;
end$$;
