-- Profiles + avatar storage
--
-- How to run: Supabase dashboard -> SQL Editor -> New query -> paste this
-- whole file -> Run. Safe to run more than once.
--
-- Creates:
--   * public.profiles (one row per auth user, created by a trigger on signup)
--   * the public "avatars" storage bucket + per-user folder policies
--   * read-only access to public.football for signed-in and anonymous visitors


-- 1. Profiles table ---------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  first_name  text,
  last_name   text,
  bio         text,
  avatar_path text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- NULL passes a check, so names stay optional until onboarding is done
  constraint profiles_first_name_len check (char_length(first_name) between 1 and 50),
  constraint profiles_last_name_len  check (char_length(last_name) between 1 and 50),
  constraint profiles_bio_len        check (char_length(bio) <= 160),
  -- avatar files must live in the owner's own folder: <user id>/<uuid>.<ext>
  constraint profiles_avatar_path_owner
    check (avatar_path is null or avatar_path ~ ('^' || id::text || '/[0-9a-f-]{36}\.(png|jpg|webp)$'))
);

comment on table public.profiles is
  'One row per user. Created automatically on first sign-in.';
comment on column public.profiles.id is
  'Same id as auth.users; deleting the user deletes the profile.';
comment on column public.profiles.first_name is
  'Null until the user finishes onboarding.';
comment on column public.profiles.last_name is
  'Null until the user finishes onboarding.';
comment on column public.profiles.avatar_path is
  'Path inside the avatars bucket (<user id>/<file>). Never the image bytes.';


-- 2. Keep updated_at fresh --------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- 3. Grants + row level security --------------------------------------------

-- New tables no longer get Data API grants automatically, so spell them out.
revoke all on public.profiles from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No delete policy on purpose: rows go away with the auth user (cascade).


-- 4. Create a profile when a new user signs up ------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Names are left empty so the app sends the user through onboarding.
  begin
    insert into public.profiles (id, email)
    values (new.id, new.email)
    on conflict (id) do nothing;
  exception when others then
    -- Never block a sign-in because of a profile problem; the app can
    -- still upsert the row later.
    raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

-- Only the trigger should ever run this
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 5. Backfill users who signed up before this ran ---------------------------

insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;


-- 6. Avatars bucket ---------------------------------------------------------

-- Public so <img> tags can use plain public URLs. 5 MB cap, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- 7. Avatar file policies ---------------------------------------------------

-- Users can only touch files under their own <user id>/ folder.
-- There is no bucket-wide select policy: public URLs still work, but nobody
-- can list other people's files.

drop policy if exists avatars_select_own on storage.objects;
create policy avatars_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );


-- 8. Football: readable by everyone, writable by no one ---------------------

-- Signed-in users now query as "authenticated" instead of "anon", so both
-- need read access. The app never writes here, so writes through the public
-- key are shut off; rows can still be edited from the dashboard.
do $$
begin
  if to_regclass('public.football') is not null then
    revoke insert, update, delete, truncate on public.football from anon, authenticated;
    grant select on public.football to anon, authenticated;
    drop policy if exists "football_public_read" on public.football;
    create policy "football_public_read" on public.football for select to anon, authenticated using (true);
    alter table public.football enable row level security;
  end if;
end $$;


-- 9. Quick checks (run separately if you want) -------------------------------

-- select * from public.profiles;
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'avatars';
-- select schemaname, tablename, policyname, cmd, roles from pg_policies where schemaname in ('public', 'storage') order by schemaname, tablename, policyname;
-- select tgname from pg_trigger where tgname = 'on_auth_user_created';
