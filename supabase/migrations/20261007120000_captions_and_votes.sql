-- Captions, votes + post images
--
-- How to run: Supabase dashboard -> SQL Editor -> New query -> paste this
-- whole file -> Run. Safe to run more than once. Run it after
-- 20260930120000_profiles_and_avatars.sql, which defines public.set_updated_at().
--
-- Creates:
--   * public.humor_flavors (seeded caption voices; read-only)
--   * public.images (one row per uploaded photo)
--   * public.captions (generated captions, private until the owner posts them)
--   * public.caption_votes (one up/down vote per user per caption)
--   * public.generation_attempts (append-only log behind the daily cap)
--   * triggers that stamp posted_at and keep the vote counters in sync
--   * the public "images" storage bucket + per-user folder policies
--   * row level security on every table in the public schema


-- 1. Humor flavors ----------------------------------------------------------

create table if not exists public.humor_flavors (
  id          smallint primary key,
  slug        text not null unique,
  name        text not null,
  description text not null,
  sort_order  smallint not null
);

comment on table public.humor_flavors is
  'The voices captions are written in. Seeded below; the app never writes here.';
comment on column public.humor_flavors.description is
  'Prompt fragment that tells the model how this voice writes.';

insert into public.humor_flavors (id, slug, name, description, sort_order)
values
  (1, 'midwest-transplant', 'Midwest transplant',
   'Write as a wholesome, overly polite Midwest transplant who is genuinely amazed or confused by New York prices, pace, and culture. Compare the scene to back home (free parking, a two dollar coffee, strangers who say hi) and stay sweet, never mean.',
   1),
  (2, 'jaded-new-yorker', 'Jaded New Yorker',
   'Write as a deadpan, unimpressed New Yorker who has seen it all and is surprised by nothing. Use one dry, flat one-liner with no exclamation points.',
   2),
  (3, 'chronically-online', 'Chronically online',
   'Write as someone extremely online: all lowercase, internet slang, and meme formats like "me when", "pov:", and "not the ___". It should read like the top comment on a viral post.',
   3),
  (4, 'overheard-in-butler', 'Overheard in Butler',
   'Write like a sleep-deprived Columbia student quote overheard in Butler Library at 2am. Tie the photo to midterms, the Core, dining hall food, or dorm life, as if said out loud to a friend.',
   4)
on conflict (id) do update
  set slug        = excluded.slug,
      name        = excluded.name,
      description = excluded.description,
      sort_order  = excluded.sort_order;


-- 2. Images -----------------------------------------------------------------

create table if not exists public.images (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  image_path text not null unique,
  context    text,
  created_at timestamptz not null default now(),

  constraint images_context_len check (context is null or char_length(context) <= 140),
  -- photos must live in the owner's own folder: <user id>/<uuid>.jpg
  constraint images_path_owner
    check (image_path ~ ('^' || user_id::text || '/[0-9a-f-]{36}\.jpg$'))
);

comment on table public.images is
  'One row per uploaded photo. Deleting it deletes its captions (cascade).';
comment on column public.images.image_path is
  'Path inside the images bucket (<user id>/<file>.jpg). Never the image bytes.';
comment on column public.images.context is
  'Optional note from the uploader ("what is going on here?"), max 140 chars.';

-- "Your photos" on the dashboard
create index if not exists images_user_id_created_at_idx
  on public.images (user_id, created_at desc);


-- 3. Captions ---------------------------------------------------------------

create table if not exists public.captions (
  id              uuid primary key default gen_random_uuid(),
  image_id        uuid not null references public.images (id) on delete cascade,
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  humor_flavor_id smallint not null references public.humor_flavors (id),
  content         text not null,
  prompt          text not null,
  model           text not null,
  is_public       boolean not null default false,
  posted_at       timestamptz,
  upvotes         integer not null default 0,
  downvotes       integer not null default 0,
  score           integer generated always as (upvotes - downvotes) stored,
  created_at      timestamptz not null default now(),

  constraint captions_content_len   check (char_length(content) between 1 and 200),
  constraint captions_upvotes_min   check (upvotes >= 0),
  constraint captions_downvotes_min check (downvotes >= 0)
);

comment on table public.captions is
  'Generated captions for a photo. Private until the owner posts them.';
comment on column public.captions.prompt is
  'The full prompt sent to the model when this caption was generated.';
comment on column public.captions.model is
  'Id of the model that wrote this caption.';
comment on column public.captions.is_public is
  'False until the owner clicks Post. Only public captions show in the feed and can be voted on.';
comment on column public.captions.posted_at is
  'Set by a trigger the first time the caption is posted. Kept if it is unposted.';
comment on column public.captions.upvotes is
  'Maintained by a trigger on caption_votes. Users cannot write it.';
comment on column public.captions.downvotes is
  'Maintained by a trigger on caption_votes. Users cannot write it.';

create index if not exists captions_image_id_idx
  on public.captions (image_id);
-- Feed: "New" tab
create index if not exists captions_public_posted_at_idx
  on public.captions (is_public, posted_at desc);
-- Feed: "Top" tab
create index if not exists captions_public_score_idx
  on public.captions (is_public, score desc);


-- 4. Caption votes ----------------------------------------------------------

create table if not exists public.caption_votes (
  caption_id uuid not null references public.captions (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  value      smallint not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- one vote per user per caption
  primary key (caption_id, user_id),
  constraint caption_votes_value_check check (value in (-1, 1))
);

comment on table public.caption_votes is
  'One up (1) or down (-1) vote per user per caption. Clearing a vote deletes the row.';

create index if not exists caption_votes_user_id_idx
  on public.caption_votes (user_id);

-- Reuses public.set_updated_at() from the profiles migration.
drop trigger if exists caption_votes_set_updated_at on public.caption_votes;
create trigger caption_votes_set_updated_at
  before update on public.caption_votes
  for each row execute function public.set_updated_at();


-- 5. Stamp posted_at on the first Post ---------------------------------------

create or replace function public.set_caption_posted_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Only react when the caption goes public. The vote counter trigger below
  -- also updates captions; without this guard every vote would touch
  -- posted_at. The first stamp is kept, so unposting and re-posting can't
  -- bump an old caption back to the top of New.
  if new.is_public and not old.is_public and new.posted_at is null then
    new.posted_at := now();
  end if;
  return new;
end;
$$;

-- Only the trigger should ever run this
revoke execute on function public.set_caption_posted_at() from public, anon, authenticated;

drop trigger if exists captions_set_posted_at on public.captions;
create trigger captions_set_posted_at
  before update on public.captions
  for each row execute function public.set_caption_posted_at();


-- 6. Keep vote counters in sync ---------------------------------------------

-- security definer: users have no UPDATE grant on captions.upvotes/downvotes,
-- so the counters can only change through this trigger.
create or replace function public.tally_caption_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Take the old vote back out. Matching 0 rows is fine: during a cascade
  -- delete (images -> captions -> votes) the caption is already gone.
  if tg_op in ('UPDATE', 'DELETE') then
    update public.captions
       set upvotes   = greatest(upvotes   - (old.value =  1)::int, 0),
           downvotes = greatest(downvotes - (old.value = -1)::int, 0)
     where id = old.caption_id;
  end if;

  -- Count the new vote.
  if tg_op in ('INSERT', 'UPDATE') then
    update public.captions
       set upvotes   = upvotes   + (new.value =  1)::int,
           downvotes = downvotes + (new.value = -1)::int
     where id = new.caption_id;
  end if;

  -- after trigger: the return value is ignored
  return null;
end;
$$;

-- Only the trigger should ever run this
revoke execute on function public.tally_caption_vote() from public, anon, authenticated;

drop trigger if exists caption_votes_tally on public.caption_votes;
create trigger caption_votes_tally
  after insert or update or delete on public.caption_votes
  for each row execute function public.tally_caption_vote();


-- 7. Humor flavors: grants + row level security -----------------------------

-- New tables no longer get Data API grants automatically, so spell them out.
-- Everyone can read the list; nobody writes it through the API.
revoke all on public.humor_flavors from anon, authenticated;
grant select on public.humor_flavors to anon, authenticated;
grant all on public.humor_flavors to service_role;

alter table public.humor_flavors enable row level security;

drop policy if exists humor_flavors_select_all on public.humor_flavors;
create policy humor_flavors_select_all on public.humor_flavors
  for select to anon, authenticated
  using (true);


-- 8. Images: grants + row level security ------------------------------------

-- Column grants: users only ever send image_path and context. id, user_id
-- and created_at come from defaults. No update grant at all.
-- context is write-only through the API: it is the uploader's private note
-- and only ever goes into the prompt.
revoke all on public.images from anon, authenticated;
grant select (id, user_id, image_path, created_at) on public.images to anon, authenticated;
grant insert (image_path, context) on public.images to authenticated;
grant delete on public.images to authenticated;
grant all on public.images to service_role;

alter table public.images enable row level security;

-- Visible to the owner, or to anyone once at least one caption is posted.
-- This reads captions, so the captions select policy must stay subquery-free
-- (see section 9).
drop policy if exists images_select_own_or_posted on public.images;
create policy images_select_own_or_posted on public.images
  for select to anon, authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.captions c
      where c.image_id = images.id
        and c.is_public
    )
  );

drop policy if exists images_insert_own on public.images;
create policy images_insert_own on public.images
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Only used to roll back a failed generation, so it only matches photos that
-- have no captions yet. Photos with captions are permanent.
drop policy if exists images_delete_own on public.images;
create policy images_delete_own on public.images
  for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and not exists (
      select 1 from public.captions c
      where c.image_id = images.id
    )
  );

-- No update policy on purpose: a photo never changes after upload.


-- 9. Captions: grants + row level security ----------------------------------

-- Column grants: users can write the caption itself once and flip is_public.
-- They can never write upvotes, downvotes, score, posted_at, user_id or id.
-- prompt is write-only through the API because it includes the uploader's
-- private note; it stays readable in the dashboard.
-- Trade-off: the app has no secret key, so captions are inserted with the
-- user's own token. Someone could insert text through the API directly, but
-- only on their own photo, and it stays private until they post it.
revoke all on public.captions from anon, authenticated;
grant select (id, image_id, user_id, humor_flavor_id, content, model, is_public,
              posted_at, upvotes, downvotes, score, created_at)
  on public.captions to anon, authenticated;
grant insert (image_id, humor_flavor_id, content, prompt, model) on public.captions to authenticated;
grant update (is_public) on public.captions to authenticated;
grant all on public.captions to service_role;

alter table public.captions enable row level security;

-- WARNING: keep this policy free of subqueries of any kind. That includes
-- the usual (select auth.uid()) wrapper, which Postgres counts as a
-- subquery: inserting a caption checks images, the images policy reads
-- captions, and if this policy has any subquery Postgres stops with
-- "infinite recursion detected in policy for relation captions".
-- So auth.uid() is called directly here, on purpose.
drop policy if exists captions_select_public_or_own on public.captions;
create policy captions_select_public_or_own on public.captions
  for select to anon, authenticated
  using (is_public or auth.uid() = user_id);

-- New captions must belong to the caller and hang off the caller's own photo.
drop policy if exists captions_insert_own on public.captions;
create policy captions_insert_own on public.captions
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.images i
      where i.id = captions.image_id
        and i.user_id = (select auth.uid())
    )
  );

-- Post / Unpost your own captions. Never reads another table. The
-- (select auth.uid()) wrapper is fine here: update policies only apply to
-- the table being updated, never inside another policy's subquery.
drop policy if exists captions_update_own on public.captions;
create policy captions_update_own on public.captions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- No delete policy on purpose: captions go away with their photo (cascade).


-- 10. Caption votes: grants + row level security ----------------------------

-- Nobody can read anyone else's votes; public scores come from the counter
-- columns on captions. Signed-out visitors get nothing here.
revoke all on public.caption_votes from anon, authenticated;
grant select, delete on public.caption_votes to authenticated;
grant insert (caption_id, value) on public.caption_votes to authenticated;
grant update (value) on public.caption_votes to authenticated;
grant all on public.caption_votes to service_role;

alter table public.caption_votes enable row level security;

drop policy if exists caption_votes_select_own on public.caption_votes;
create policy caption_votes_select_own on public.caption_votes
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- You can only vote on captions that are posted.
drop policy if exists caption_votes_insert_own on public.caption_votes;
create policy caption_votes_insert_own on public.caption_votes
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.captions c
      where c.id = caption_votes.caption_id
        and c.is_public
    )
  );

drop policy if exists caption_votes_update_own on public.caption_votes;
create policy caption_votes_update_own on public.caption_votes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.captions c
      where c.id = caption_votes.caption_id
        and c.is_public
    )
  );

-- Clearing a vote deletes the row. Allowed even after the caption is unposted.
drop policy if exists caption_votes_delete_own on public.caption_votes;
create policy caption_votes_delete_own on public.caption_votes
  for delete to authenticated
  using ((select auth.uid()) = user_id);


-- 11. Images bucket ---------------------------------------------------------

-- Public so <img> tags can use plain public URLs. 5 MB cap, JPEG only (the
-- browser re-encodes every photo before upload).
-- Trade-off: an unposted photo can be seen by anyone who has its URL. The
-- file name is a random UUID and nobody can list the bucket, so the URL
-- cannot be guessed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- 12. Image file policies ---------------------------------------------------

-- Users can only touch files under their own <user id>/ folder.
-- There is no bucket-wide select policy: public URLs still work, but nobody
-- can list other people's files. Named post_images_* so they never collide
-- with the avatars_* policies on the same table.

drop policy if exists post_images_select_own on storage.objects;
create policy post_images_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Uploads must be exactly <user id>/<uuid>.jpg, the only name the app uses.
drop policy if exists post_images_insert_own on storage.objects;
create policy post_images_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f-]{36}\.jpg$')
  );

-- Only files no photo row points at (a failed or abandoned upload). Once a
-- post exists its file can't be deleted and re-uploaded with different bytes.
drop policy if exists post_images_delete_own on storage.objects;
create policy post_images_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (
      select 1 from public.images i
      where i.image_path = objects.name
    )
  );

-- No update policy on purpose: photos are never replaced in place, so
-- uploads must use upsert: false.


-- 13. Generation attempts (daily cap) ---------------------------------------

-- One row per caption run, written before the model is called. Append-only:
-- no update or delete grants, so failed runs, deleted photos and parallel
-- requests all still count toward the daily cap.
create table if not exists public.generation_attempts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  image_path text not null,
  created_at timestamptz not null default now(),

  constraint generation_attempts_path_owner
    check (image_path ~ ('^' || user_id::text || '/[0-9a-f-]{36}\.jpg$'))
);

comment on table public.generation_attempts is
  'Append-only log of caption runs. Counted for the daily limit.';

create index if not exists generation_attempts_user_id_created_at_idx
  on public.generation_attempts (user_id, created_at desc);

revoke all on public.generation_attempts from anon, authenticated;
grant select (id, user_id, created_at) on public.generation_attempts to authenticated;
grant insert (image_path) on public.generation_attempts to authenticated;
grant all on public.generation_attempts to service_role;

alter table public.generation_attempts enable row level security;

drop policy if exists generation_attempts_select_own on public.generation_attempts;
create policy generation_attempts_select_own on public.generation_attempts
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists generation_attempts_insert_own on public.generation_attempts;
create policy generation_attempts_insert_own on public.generation_attempts
  for insert to authenticated
  with check ((select auth.uid()) = user_id);


-- 14. Row level security on every public table ------------------------------

-- Any public table without policies becomes deny-all through the API. That
-- is intended: a table made later in the dashboard stays locked until it
-- gets its own grants and policies.
do $$
declare
  r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    begin
      execute format('alter table public.%I enable row level security', r.tablename);
    exception when insufficient_privilege then
      -- e.g. a table created by an extension and owned by another role
      raise warning 'Could not enable RLS on public.%: %', r.tablename, sqlerrm;
    end;
  end loop;
end $$;


-- 15. Quick checks (run separately if you want) ------------------------------

-- select tablename, rowsecurity from pg_tables where schemaname = 'public' order by tablename;
-- select schemaname, tablename, policyname, cmd, roles from pg_policies where schemaname in ('public', 'storage') order by schemaname, tablename, policyname;
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'images';
-- select c.id, c.content, c.score, c.posted_at, f.name as flavor, i.image_path
--   from public.captions c
--   join public.images i on i.id = c.image_id
--   join public.humor_flavors f on f.id = c.humor_flavor_id
--  where c.is_public
--  order by c.score desc, c.posted_at desc
--  limit 20;
-- select * from public.humor_flavors order by sort_order;
