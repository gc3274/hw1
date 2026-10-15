-- Roast mode: AI critics roast what people made
--
-- How to run: Supabase dashboard -> SQL Editor -> New query -> paste this
-- whole file -> Run. Safe to run more than once. Run it after
-- 20261007120000_captions_and_votes.sql.
--
-- Additive only, so older deploys keep working against the same database:
-- they never read the new columns, and their feed skips captions without a
-- humor flavor, which is every roast.
--
-- Adds:
--   * public.critics (seeded critic characters; read-only)
--   * images.topic (what kind of thing was posted; null for caption posts)
--   * captions.critic_id, captions.rating, captions.tip (a roast is a caption
--     written by a critic, with a score out of 10 and one real tip)


-- 1. Critics ----------------------------------------------------------------

create table if not exists public.critics (
  id          smallint primary key,
  slug        text not null unique,
  name        text not null,
  emoji       text not null,
  -- null = general panel, judges every topic
  topic       text,
  description text not null,
  sort_order  smallint not null,

  constraint critics_topic_check check (topic is null or topic in ('food', 'art', 'room', 'fit'))
);

comment on table public.critics is
  'Original critic characters that roast posts. Seeded below; the app never writes here.';
comment on column public.critics.topic is
  'The topic this critic is the expert on, or null for the general panel.';
comment on column public.critics.description is
  'Prompt fragment that tells the model how this critic talks.';

insert into public.critics (id, slug, name, emoji, topic, description, sort_order)
values
  (1, 'chef-scorch', 'Chef Scorch', '🔥', 'food',
   'A hot-tempered celebrity TV chef who has run kitchens for thirty years and takes every bad plate personally. Yells in kitchen metaphors, calls out exactly what is overcooked, underseasoned or sad about the plating, and acts physically pained by it. An original character: never use a real chef''s name or catchphrases.',
   1),
  (2, 'vivienne-vex', 'Vivienne Vex', '🧐', 'art',
   'A snobby downtown gallery curator who has seen real masterpieces at the Met and takes this piece as a personal insult. Uses art-world jargon (composition, negative space, derivative), compares it unfavorably to famous movements, and sighs a lot.',
   2),
  (3, 'reno-randy', 'Reno Randy', '🔨', 'room',
   'An over-the-top home makeover TV host who wants to knock down every wall. Treats the room like a disaster zone, gasps at the lighting, clutter and decor, and pitches an absurd renovation.',
   3),
  (4, 'margaux', 'Margaux', '💅', 'fit',
   'An ice-cold fashion magazine editor who judges an outfit in one calm, devastating sentence. Talks only about the clothes, colors, fit and styling, never the wearer''s body, face or looks.',
   4),
  (5, 'jaded-new-yorker', 'Jaded New Yorker', '🗽', null,
   'A deadpan New Yorker who has seen everything and is impressed by nothing. One dry, flat line, often comparing it to something sad they saw on the subway. No exclamation points.',
   5),
  (6, 'chronically-online', 'Chronically Online', '📱', null,
   'An extremely online Gen Z hater: all lowercase, internet slang and meme formats ("the way i gasped", "not the ___", "ratio"). Reads like the top quote-tweet dunking on it.',
   6),
  (7, 'midwest-mom', 'Midwest Mom', '🥧', null,
   'A sweet Midwestern mom whose niceness is all backhanded compliments ("well, isn''t that... different!"). Never says anything openly mean, which somehow makes it worse.',
   7)
on conflict (id) do update
  set slug        = excluded.slug,
      name        = excluded.name,
      emoji       = excluded.emoji,
      topic       = excluded.topic,
      description = excluded.description,
      sort_order  = excluded.sort_order;

-- Everyone can read the list; nobody writes it through the API.
revoke all on public.critics from anon, authenticated;
grant select on public.critics to anon, authenticated;
grant all on public.critics to service_role;

alter table public.critics enable row level security;

drop policy if exists critics_select_all on public.critics;
create policy critics_select_all on public.critics
  for select to anon, authenticated
  using (true);


-- 2. Images: topic ----------------------------------------------------------

alter table public.images add column if not exists topic text;

alter table public.images drop constraint if exists images_topic_check;
alter table public.images add constraint images_topic_check
  check (topic is null or topic in ('food', 'art', 'room', 'fit', 'anything'));

comment on column public.images.topic is
  'What was posted for roasting (food, art, room, fit, anything). Null for caption posts.';

-- Written once at upload, like image_path; still no update grant.
grant select (topic) on public.images to anon, authenticated;
grant insert (topic) on public.images to authenticated;

create index if not exists images_topic_idx on public.images (topic);


-- 3. Captions: roasts -------------------------------------------------------

-- A caption is written either in a humor flavor or by a critic, never both.
alter table public.captions alter column humor_flavor_id drop not null;
alter table public.captions add column if not exists critic_id smallint references public.critics (id);
alter table public.captions add column if not exists rating smallint;
alter table public.captions add column if not exists tip text;

alter table public.captions drop constraint if exists captions_one_voice;
alter table public.captions add constraint captions_one_voice
  check ((humor_flavor_id is null) <> (critic_id is null));
alter table public.captions drop constraint if exists captions_rating_range;
alter table public.captions add constraint captions_rating_range
  check (rating is null or rating between 0 and 10);
alter table public.captions drop constraint if exists captions_tip_len;
alter table public.captions add constraint captions_tip_len
  check (tip is null or char_length(tip) between 1 and 200);

comment on column public.captions.critic_id is
  'The critic who wrote this roast. Null for humor-flavor captions.';
comment on column public.captions.rating is
  'The critic''s score for the posted thing, 0 to 10. Null for humor-flavor captions.';
comment on column public.captions.tip is
  'One honest suggestion that ends the roast. Null for humor-flavor captions.';

-- Same rules as content: written once by the owner, readable once posted.
grant select (critic_id, rating, tip) on public.captions to anon, authenticated;
grant insert (critic_id, rating, tip) on public.captions to authenticated;

create index if not exists captions_critic_id_idx on public.captions (critic_id);


-- Make the API see the new table and columns right away
notify pgrst, 'reload schema';
