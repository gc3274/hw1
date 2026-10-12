# Caption City Roadmap

Caption City: snap a campus or NYC photo, get AI-written captions in different humor styles, post the best ones, and let everyone vote.

Each feature goes through a short design pass before it's built: what it does, open questions, and a yes from the product owner. Statuses:

- ✅ Shipped
- 🚧 In progress
- 📝 Next (designed or ready for design)
- 💡 Idea (backlog)

---

## ✅ Shipped

| Feature | Notes |
|---|---|
| Next.js app + Vercel deploys | Every push to `main` deploys |
| Football stats page | Reads from Supabase (`/stats`) |
| Google sign-in, profiles, onboarding, dashboard | Protected routes, avatar upload, bio |
| AI captions in four humor styles | Gemini writes 2 captions per style per photo |
| Private-until-posted captions, up/down votes | Feed with Top this week / New; row-level security on every table |

Current humor styles: **Midwest transplant**, **Jaded New Yorker**, **Chronically online**, **Overheard in Butler**.

---

## 🚧 In progress: Redesign (branch `redesign`)

A dark "night city" look with motion throughout, built on React Bits components. Nothing gets merged until it has been tested locally.

- [x] Animation libraries and motion-preference helpers (reduced motion and touch screens get no effects)
- [x] Dark theme, fonts (Bricolage Grotesque, Geist, Geist Mono), shared button and card styles
- [x] Glass header with gooey nav, click sparks, smooth page transitions
- [ ] Animated title screen and signed-in welcome band
- [ ] Feed cards with spotlight hover, scroll reveals, rolling vote scores
- [ ] Caption review: Private/Post switch per caption, saved all at once with Done; fix cut-off boxes
- [ ] Drag-and-drop photo picker and a fun "writing captions" screen
- [ ] Login, dashboard counters, 404 and error pages, restyle of the remaining pages
- [ ] Welcome screen for first-time visitors with "Look around as a guest", a guest banner, and a sign-in bar on the feed
- [ ] Full check on phone and desktop, with and without reduced motion

---

## 📝 Next

### Topic of the week and browsing by subject

Give people a reason to come back every week, and a way to browse what they're into.

- **Topic of the week:** a weekly prompt ("Bodega cats", "Subway sightings", "Dorm views") shown at the top of the feed, with its own tab. Uploads can be entered into the week's topic.
- **Browse by subject:** each photo gets a subject (campus, subway, food, pets, dorms, nightlife, …) so the feed can be filtered with chips. The AI could suggest the subject when it writes the captions, since it already sees the photo.

Open questions:
- Who picks the weekly topic: hand-picked, AI-suggested, or community-voted?
- Does the week end with a winner, a badge, or an archive page of past topics?
- Is the subject set by the AI, the uploader, or both?

### One-shot mode: a game of luck

Upload one photo and get exactly **one** caption in a random humor style. You can't pick or reroll. It's a gamble on your photo and the AI's joke landing together.

- It's posted to its own "One-shot" feed and ranked by votes like everything else.
- It might have its own daily limit (e.g. one shot per day) to keep it special.

Open questions:
- Does the caption post automatically, or can you still back out? Auto-posting needs a clear warning before upload and a way to delete afterwards.
- Is the humor style random, or do you pick the style but not the caption?
- Does it get a separate leaderboard or streak?

### More humor styles

More styles make it more fun. Ideas to try:
- Nature documentary narrator
- Film-noir detective
- Sports commentator
- Overly dramatic tour guide
- Conspiracy theorist
- Corporate LinkedIn post
- Shakespearean
- Gen Z group chat

Open questions:
- Generate every style for every photo, or let people pick 4 per upload so generation stays fast and cheap?
- Rotate a featured "style of the week"?
- How do we check new styles stay funny without punching down (prompt review plus a report button)?

---

## 💡 Ideas (backlog)

- Streaks for posting or voting several days in a row
- Leaderboards (top captions, top photographers) by week and all time
- Public profile pages with credit for the photographer
- A report button and a moderation queue
- Share cards: a nice image of a caption on its photo, for social media
- Comments or reactions on posts
