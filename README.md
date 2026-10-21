# Deconstructive Criticism

Post what you made: a meal, a drawing, your room or your fit. AI critics roast it, score it out of 10 and leave one real tip. Then everyone votes on the roasts that land.

A class project for Columbia and Barnard. Live at [hw1-two.vercel.app](https://hw1-two.vercel.app); every push to `main` deploys on Vercel.

Stack: Next.js 16.3.5 (App Router, `proxy.ts`), React 19, Tailwind 4, Supabase (Postgres, Auth with Google, Storage), Gemini through `@google/genai`, and vitest.

## How it works

1. **Sign in** with Google and add your name on `/onboarding`.
2. **Post** on `/new`: pick a topic and a photo, and add an optional note for the critics. The photo is resized to a JPEG in the browser (iPhone HEIC photos included) and uploaded to the `images` bucket.
3. **The panel judges it.** One Gemini call writes a roast for every critic on the topic's panel: the topic's expert plus the three general critics ("Anything" gets only the three). Each roast is at most 200 characters, with a score out of 10 and one real tip.
4. **Private review.** Everything starts private. On `/images/[id]` the owner switches the roasts they can handle to Post and saves.
5. **Vote.** Posted roasts show up in the feed on `/`, sorted by Top this week or New and filtered by topic. Signed-in users vote each roast up or down; guests can browse.

House rules:
- Critics roast the thing, never the person. Photos that are mainly of a person are turned away.
- 5 posts per person per 24 hours (the cap counts uploads, not roasts).
- Nothing is public until its owner posts it, and the uploader's note is never shown.

### Topics and critics

The critics are original characters, seeded by `20261015120000_roast_mode.sql`. The app never writes to `critics`.

| Topic | Expert | General panel |
|---|---|---|
| Food (a meal you cooked) | 🔥 Chef Scorch, a hot-tempered TV chef | yes |
| Art (a drawing or painting) | 🧐 Vivienne Vex, a snobby gallery curator | yes |
| Room (your dorm or desk setup) | 🔨 Reno Randy, an over-the-top makeover host | yes |
| Fit (today's outfit) | 💅 Margaux, an ice-cold fashion editor | yes |
| Anything | none | yes |

The general panel judges every topic: 🗽 Jaded New Yorker, 📱 Chronically Online and 🥧 Midwest Mom.

## Routes

| Route | What it is | Who |
|---|---|---|
| `/` | The roast feed (Top this week / New, topic chips, Show more) | Everyone. A first-time signed-out visitor is sent to `/welcome` |
| `/welcome` | Landing page with a preview of top roasts and "Browse as a guest" | Signed out (signed-in users go to `/`) |
| `/login` | Google sign-in | Signed out (signed-in users go to `/`) |
| `/auth/callback` | OAuth code exchange (GET), then `/` or `/onboarding` | Everyone |
| `/onboarding` | Add your name | Signed in |
| `/new` | Upload a photo for roasting (`maxDuration = 60`) | Signed in, profile complete |
| `/images/[id]` | Owner: private review of the panel. Everyone else: the posted roasts | Owner, or anyone once a roast is posted |
| `/dashboard` | Your posts, roasts posted and crowd score | Signed in, profile complete |
| `/profile` | Name, bio (`#bio`) and avatar | Signed in, profile complete |
| `/privacy` | What is stored and who can see it | Everyone |
| `/stats` | Football stats from HW1. Still a route, but nothing links to it | Everyone |

Plus `not-found`, `error` and `app/icon.svg`.

Redirects in `next.config.ts` (307, query string kept): `/roast` → `/` and `/roast/new` → `/new`. These were the URLs of the roast-mode demo.

The proxy (`proxy.ts`, `lib/supabase/proxy.ts`) only does optimistic redirects for page loads. Every page and server action checks the user again through `lib/dal.ts`.

## Environment

Put these in `.env.local` (never commit it), and in the Vercel project settings:

| Name | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, which wins if both are set |
| `GEMINI_API_KEY` | Server only |
| `GEMINI_MODEL` | Optional. Defaults to `gemini-3.5-flash`; an override must accept the MINIMAL thinking level. `gemini-flash-lite-latest` is tried once when the main model is busy |

This app never uses the service-role key. Only the admin area has it.

## Supabase setup

Run the migrations in `supabase/migrations/` in this order. Paste each whole file into Dashboard → SQL Editor → New query and run it with the role picker on `postgres`:

1. `20260930120000_profiles_and_avatars.sql`: `profiles` (created by a trigger on sign-up), the `avatars` bucket, read access to `football`
2. `20261007120000_captions_and_votes.sql`: `humor_flavors`, `images`, `captions`, `caption_votes`, `generation_attempts`, the `images` bucket, and row level security on every table
3. `20261015120000_roast_mode.sql`: `critics`, `images.topic`, and `captions.critic_id`, `rating` and `tip`
4. `20261021120000_superadmin.sql`: `profiles.is_superadmin`, column-level insert/update grants on `profiles`, and a guard trigger on the flag

Each file can be re-run on its own, but re-running an older file resets grants that a later file added. **After re-running any file, re-run every later file, in order.** The two cases that bite:

- **Never re-run `20260930120000_profiles_and_avatars.sql` after the superadmin migration.** It grants table-level insert and update on `profiles` again, which replaces the column grants. The guard trigger still blocks the flag, but if it happens, re-run the later files, which ends with `20261021120000_superadmin.sql` restoring the column grants.
- Re-running `20261007120000_captions_and_votes.sql` revokes everything on `images` and `captions` and grants back only its own columns. That drops the roast-mode grants on `images.topic` and `captions.critic_id`, `rating` and `tip`, and every feed, post and dashboard read then fails with a permission error (42501) until `20261015120000_roast_mode.sql` runs again. Re-run it and the superadmin file right after.

Auth:
- Enable the Google provider under Authentication → Providers.
- Under Authentication → URL Configuration → Redirect URLs, allow `http://localhost:3000/**` and the Vercel domains. The app sends Google sign-ins back to `<origin>/auth/callback`.

### Superadmin flag

The admin area (below) only lets in profiles with `is_superadmin = true`. Run all of these in the SQL editor as `postgres`.

Check the editor's role first:

```sql
select current_user, session_user, auth.jwt() ->> 'role' as jwt_role;
-- expect: postgres | postgres (or supabase_admin) | null
```

**Bootstrap the first superadmin.** Sign in once with that Google account first, on either app. This matches on `auth.users.email`, never on `profiles.email`, which users can edit.

```sql
insert into public.profiles (id, email, is_superadmin)
select u.id, u.email, true
  from auth.users u
 where lower(u.email) = lower('<GOOGLE_EMAIL>')
on conflict (id) do update set is_superadmin = true
returning id, email, is_superadmin;
-- Expect exactly 1 row. 0 rows means that account has never signed in.
```

**Revoke an admin, and list the admins:**

```sql
update public.profiles p set is_superadmin = false
  from auth.users u
 where u.id = p.id and lower(u.email) = lower('<THEIR_EMAIL>')
returning p.id, u.email, p.is_superadmin;

select p.id, u.email, u.last_sign_in_at
  from public.profiles p join auth.users u on u.id = p.id
 where p.is_superadmin;
```

**Verify the migration** by impersonating a signed-in non-admin test account. Every change is rolled back at the end.
- Pass: "Success. No rows returned", and the final SELECT shows the row unchanged.
- Fail: an error that starts with `FAIL`.
- Checks 1 to 6 are required. Checks 7 and 8 are optional: their setup runs inside their own exception handlers, so if the editor can't switch roles they are skipped with a notice instead of failing the run. The SQL editor doesn't always show notices, and when it doesn't, a skipped check 7 or 8 looks exactly like a pass, so a clean run proves only checks 1 to 6.

```sql
do $$
declare
  me       uuid;
  my_email text;
  n        int;
  flag     boolean;
begin
  select id, email into me, my_email from auth.users
   where lower(email) = lower('<TEST_USER_EMAIL>');
  if me is null then raise exception 'SETUP: no auth user with that email'; end if;

  begin  -- everything in this block is undone by the ZV999 at the end
    -- = set local request.jwt.claims ...; set local role authenticated;
    perform set_config('request.jwt.claims',
      json_build_object('sub', me, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);
    if current_user <> 'authenticated' or auth.uid() is distinct from me then
      raise exception 'FAIL 0: impersonation did not take (%, %)', current_user, auth.uid();
    end if;

    -- 1. Own first_name: allowed
    update public.profiles set first_name = 'Verify' where id = me;
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'FAIL 1: own first_name update matched % rows', n; end if;

    -- 2. The exact SQL PostgREST sends for the app's three upserts
    insert into public.profiles (id, email, first_name, last_name, bio)        -- onboarding
      values (me, my_email, 'Verify', 'User', null)
      on conflict (id) do update set id = excluded.id, email = excluded.email,
        first_name = excluded.first_name, last_name = excluded.last_name, bio = excluded.bio;
    insert into public.profiles (id, first_name, last_name, bio)               -- profile form
      values (me, 'Verify', 'User', 'bio')
      on conflict (id) do update set id = excluded.id, first_name = excluded.first_name,
        last_name = excluded.last_name, bio = excluded.bio;
    insert into public.profiles (id, avatar_path)                              -- avatar
      values (me, null)
      on conflict (id) do update set id = excluded.id, avatar_path = excluded.avatar_path;

    -- 3. Can read own flag (the admin gate depends on this)
    select is_superadmin into flag from public.profiles where id = me;
    if flag is null then raise exception 'FAIL 3: cannot read own is_superadmin'; end if;

    -- 4. Cannot update the flag (no column grant)
    begin
      update public.profiles set is_superadmin = not is_superadmin where id = me;
      raise exception 'FAIL 4: authenticated updated is_superadmin';
    exception when insufficient_privilege then null;
    end;

    -- 5. Cannot slip it in through an upsert
    begin
      insert into public.profiles (id, is_superadmin) values (me, true)
        on conflict (id) do update set is_superadmin = excluded.is_superadmin;
      raise exception 'FAIL 5: authenticated upserted is_superadmin';
    exception when insufficient_privilege then null;
    end;

    -- 6. RLS unchanged: other users' rows are invisible
    select count(*) into n from public.profiles where id <> me;
    if n <> 0 then raise exception 'FAIL 6: can see % other profiles', n; end if;

    -- 7. Optional. The trigger alone refuses authenticated, even with a
    --    (temporary) column grant on the flag
    begin
      perform set_config('role', 'none', true);
      grant update (is_superadmin) on public.profiles to authenticated;
      perform set_config('role', 'authenticated', true);
      update public.profiles set is_superadmin = not is_superadmin where id = me;
      raise exception 'FAIL 7: guard trigger let authenticated change is_superadmin';
    exception when insufficient_privilege then
      if sqlerrm not like '%is_superadmin%' then
        raise notice 'Check 7 skipped: %', sqlerrm;
      end if;
    end;

    -- 8. Optional. The admin area's service key is refused too
    begin
      perform set_config('role', 'none', true);
      perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
      perform set_config('role', 'service_role', true);
      update public.profiles set is_superadmin = not is_superadmin where id = me;
      raise exception 'FAIL 8: service_role changed is_superadmin';
    exception when insufficient_privilege then
      if sqlerrm not like '%is_superadmin%' then
        raise notice 'Check 8 skipped: %', sqlerrm;
      end if;
    end;

    raise exception using errcode = 'ZV999', message = 'rollback';
  exception when sqlstate 'ZV999' then
    null;  -- all checks passed; every change above is rolled back
  end;
end $$;

select id, first_name, last_name, is_superadmin from public.profiles
 where id = (select id from auth.users where lower(email) = lower('<TEST_USER_EMAIL>'));
```

After the migration, also check on the live app that onboarding, the profile form and an avatar change still save.

**Roll back the superadmin migration.** Drop the column *before* restoring the table-level grants; restoring them while the column exists would let every user set the flag.

```sql
begin;
drop trigger if exists profiles_guard_is_superadmin on public.profiles;
drop function if exists public.guard_profiles_is_superadmin();
alter table public.profiles drop column if exists is_superadmin;
revoke insert, update on public.profiles from authenticated;
grant insert, update on public.profiles to authenticated;
notify pgrst, 'reload schema';
commit;
```

## Admin area

The admin area is a separate Next.js app: [gc3274/hw6](https://github.com/gc3274/hw6). It runs on port 3001 against the same Supabase project and Google login. It has creative stats, users (read), roasts (create, read, update, delete) and votes and ratings (read). Every admin page and server action needs a Google sign-in plus `profiles.is_superadmin = true`; only its sign-in page and OAuth callback are open, and a signed-in non-admin gets a "not authorized" page. Its service-role key is server-only and reachable only through that check.

**Won't the first admin be locked out?** It would be, if the admin area were the only way to set the flag, because the admin area itself requires the flag. So the first superadmin is set out-of-band, with the bootstrap SQL above in the Supabase SQL editor. The editor runs as the database owner (`postgres`), so it bypasses row level security, the column grants and the guard trigger. Users can't promote themselves: the signed-in role has no insert or update grant on `is_superadmin`, and the trigger refuses everyone else, including the admin area's own service key, so a leaked key or a bug in the admin area can't mint admins. If every admin is ever lost, the same SQL editor path restores access. The database owner, not the app, is the root of trust.

## Legacy data

This app started as Caption City (AI captions in humor styles on campus and NYC photos). Caption mode is gone from the code, but its data stays in Supabase untouched:
- A legacy post is an `images` row with `topic is null`; its captions have a `humor_flavor_id` and no `critic_id`.
- The app reads roast posts only (`images.topic is not null`, `captions.critic_id is not null`). Legacy posts never show in the feed or on the dashboard, and `/images/<legacy id>` is a 404, for the owner too.
- "Never shown" means in this app. Posted legacy rows can still be read through the public Supabase Data API. The privacy page tells owners to email to have them deleted.
- `humor_flavors` and the votes on legacy captions are kept but unused.
- The guest cookie is still called `cc_guest`; renaming it would reset every guest.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm test` | vitest (pure helpers in `lib/`) |
| `npx next typegen && npx tsc --noEmit` | Type check. Route types such as `PageProps<"/">` are generated, so run `next typegen` first, especially after moving routes |

## Credits

The text and motion effects in `components/bits/` (ShinyText, SplitText, GradientText, RotatingText, StarBorder, GooeyNav, CardSwap, Aurora, FuzzyText and others) are adapted from [React Bits](https://reactbits.dev), under MIT + Commons Clause.
