-- Superadmin flag for the admin area
--
-- How to run: Supabase dashboard -> SQL Editor -> New query -> paste this
-- whole file -> Run, with the role picker on "postgres" (not an impersonated
-- user). Safe to run more than once. Run it after
-- 20261015120000_roast_mode.sql.
--
-- Adds:
--   * profiles.is_superadmin (false for everyone; the first admin is set by
--     hand in the SQL editor, see README "Admin access")
--   * column-level insert/update grants on profiles, so people keep saving
--     their own profile but can never write the flag
--   * a trigger that refuses flag changes from anyone but the database owner
--
-- The main app keeps working: it only writes id, email, first_name,
-- last_name, bio and avatar_path (app/onboarding/actions.ts,
-- app/profile/actions.ts). Code that writes any other profiles column
-- through the API must be added to the grants in section 2 first.
--
-- Never re-run 20260930120000_profiles_and_avatars.sql after this file: it
-- grants table-level insert/update again. The trigger still blocks the flag,
-- but re-run this file afterwards to restore the column grants.

begin;

-- 1. The flag ---------------------------------------------------------------

alter table public.profiles
  add column if not exists is_superadmin boolean not null default false;

comment on column public.profiles.is_superadmin is
  'Can use the admin area. Users have no insert/update grant on it and a trigger rejects every writer except the database owner, so it is only ever set from the SQL editor.';


-- 2. Column grants instead of table grants ---------------------------------

-- Revoking the table privilege also drops any column grants, so this resets
-- to a known state and keeps the file re-runnable.
revoke insert, update on public.profiles from authenticated;

-- supabase-js upsert(row, { onConflict: "id" }) becomes
--   insert (<row keys>) ... on conflict (id) do update set <every row key>
-- and that includes id itself, so id needs UPDATE too. updated_at comes from
-- the profiles_set_updated_at trigger; created_at and is_superadmin come
-- from defaults. Triggers and defaults need no column privilege.
grant insert (id, email, first_name, last_name, bio, avatar_path)
  on public.profiles to authenticated;
grant update (id, email, first_name, last_name, bio, avatar_path)
  on public.profiles to authenticated;

-- Unchanged on purpose: table-level select for authenticated (RLS still
-- limits it to the user's own row, which is how the admin area reads the
-- caller's flag), nothing for anon, grant all for service_role.


-- 3. Guard trigger (defense in depth) --------------------------------------

-- Security invoker on purpose: current_user must be the role that ran the
-- statement. As security definer it would always be the owner (postgres)
-- and the check would let everything through.
--   SQL editor:                current_user postgres,      jwt role null          -> allowed
--   Main app / user token:     current_user authenticated, jwt role authenticated -> refused
--   Admin area / service key:  current_user service_role,  jwt role service_role  -> refused
--   handle_new_user():         current_user postgres,      jwt role null          -> never sets the flag
--   Future security definer RPC called by a user:
--                              current_user postgres,      jwt role authenticated -> refused
create or replace function public.guard_profiles_is_superadmin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' and new.is_superadmin)
     or (tg_op = 'UPDATE' and new.is_superadmin is distinct from old.is_superadmin)
  then
    if current_user not in ('postgres', 'supabase_admin')
       or coalesce(auth.jwt() ->> 'role', '') in ('anon', 'authenticated')
    then
      raise exception 'profiles.is_superadmin can only be changed from the SQL editor'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

comment on function public.guard_profiles_is_superadmin() is
  'Rejects is_superadmin changes unless made by the database owner outside an API request. Must stay security invoker.';

-- Only the trigger should ever run this
revoke execute on function public.guard_profiles_is_superadmin() from public, anon, authenticated;

drop trigger if exists profiles_guard_is_superadmin on public.profiles;
create trigger profiles_guard_is_superadmin
  before insert or update on public.profiles
  for each row execute function public.guard_profiles_is_superadmin();

-- Make the API see the new column right away
notify pgrst, 'reload schema';

commit;


-- 4. Quick checks (run separately if you want) ------------------------------

-- Expect SELECT only at table level:
-- select privilege_type from information_schema.role_table_grants
--  where table_schema = 'public' and table_name = 'profiles' and grantee = 'authenticated';
-- Expect INSERT and UPDATE on exactly the 6 columns, SELECT on every column:
-- select privilege_type, column_name from information_schema.column_privileges
--  where table_schema = 'public' and table_name = 'profiles' and grantee = 'authenticated'
--  order by 1, 2;
