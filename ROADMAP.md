# Deconstructive Criticism Roadmap

Deconstructive Criticism: post what you made (a meal, a drawing, your room or your fit), a panel of AI critics roasts it, scores it out of 10 and leaves one real tip, and everyone votes on the roasts that land.

Each feature goes through a short design pass before it's built: what it does, open questions, and a yes from the product owner. Statuses:

- ✅ Shipped
- 📝 Next (designed or ready for design)
- 💡 Idea (backlog)
- Retired: taken out of the app, its data kept

---

## ✅ Shipped

| Feature | Notes |
|---|---|
| Next.js app + Vercel deploys | Every push to `main` deploys |
| Google sign-in, profiles, onboarding, dashboard | Protected routes, avatar upload, bio |
| Roast as the whole app | Pick a topic (Food, Art, Room, Fit, Anything) and a photo; the topic's expert critic plus three general critics each write a roast with a score out of 10 and one real tip |
| Private-until-posted roasts, up/down votes | Owners choose which roasts go public; row-level security on every table |
| Feed with Top this week / New and topic chips | The feed is the home page (`/`) |
| Welcome screen and guest mode | First-time visitors can look around as a guest; a sign-in bar on the feed invites them to join |
| HEIC uploads | iPhone photos are decoded in the browser |
| Night-city redesign, without the cursor gimmicks | React Bits text and motion effects stay; the cursor trail, click sparks, magnet button and border glow are gone |
| The pivot from Caption City | New name, crop-mark flame icon and roast copy everywhere; the old `/roast` URLs redirect |
| Admin area | A separate app ([gc3274/hw6](https://github.com/gc3274/hw6)) behind Google sign-in plus `profiles.is_superadmin`: creative stats, users, roasts (create, read, update, delete), votes and ratings |
| Prompt chains and logs | Roasts run on prompt chains stored in the database (One pass, and Look, then roast), picked by an editable mix; every run and model call is logged; terms and example reviews feed the prompt; the admin area edits models, providers, terms, examples, the mix and photos, and reads the logs |
| Sign-up allowlist | New accounts need a listed email domain (Columbia and Barnard to start) or a whitelisted address, checked by a Supabase hook; existing accounts are never locked out |

The football stats page from HW1 still works at `/stats`, but nothing links to it.

Current critics: **Chef Scorch** (food), **Vivienne Vex** (art), **Reno Randy** (room), **Margaux** (fit), plus the general panel of **Jaded New Yorker**, **Chronically Online** and **Midwest Mom**.

---

## Retired

### Caption mode (Caption City)

AI captions in four humor styles on campus and NYC photos. The code is gone; its posts, captions and votes stay in Supabase, untouched and hidden (posts with no topic). The `humor_flavors` table is unused.

---

## 📝 Next

### Heat level

You pick how hard you get flamed: Gentle, Medium or Extra crispy.

Open questions:
- Does the heat level change the score, or only the tone?
- Is Extra crispy still inside "roast the thing, never the person"?

### Topic of the week

A weekly prompt ("Midnight ramen", "Dorm glow-ups") shown at the top of the feed, with a critic on duty for the week. A dish the critic hated but the crowd loved could be the weekly highlight.

Open questions:
- Who picks the weekly topic: hand-picked, AI-suggested, or community-voted?
- Does the week end with a winner, a badge, or an archive page of past topics?

### "Survived the chef"

A leaderboard built on the critics' scores out of 10: the posts that scored highest with their expert, and streaks of posting week after week.

Open questions:
- Rank by the full panel's score or only the expert's?
- How do we stop it from rewarding people who only post their best work?

---

## Open questions

- **Panel-score gaming.** The public panel score only counts posted roasts, so an owner can post only the kind ones and look better than the full panel thought.
- **Critic impersonation through direct inserts.** Signed-in users can insert captions with any `critic_id` on their own photos through the Supabase Data API, so a fake "Chef Scorch" roast can be posted. Fix: write roasts through a server-only RPC. Until then the admin area can delete them.
- **One photo can fill up to 4 slots in Top.** Show one card per photo, or one per critic?

---

## 💡 Ideas (backlog)

- Streaks for posting or voting several days in a row
- Leaderboards (top roasts, harshest critic) by week and all time
- Public profile pages with credit for the maker
- A report button and a moderation queue
- Share cards: a nice image of a roast on its photo, for social media
- Comments or reactions on roasts
