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
| Night-city redesign | Dark theme and motion built on React Bits, animated title screen, feed cards with spotlight and rolling vote scores |
| Welcome screen and guest mode | First-time visitors can look around as a guest; a sign-in bar on the feed invites them to join |
| Easier uploads and caption review | Drag-and-drop photo picker, a "writing captions" screen, and Private/Post switches saved all at once with Done |

Current humor styles: **Midwest transplant**, **Jaded New Yorker**, **Chronically online**, **Overheard in Butler**.

---

## 📝 Next

### Roast mode: AI critics flame what you made (possible new direction)

A posting game. You post something you made, like a meal you cooked, a drawing, your dorm room or today's outfit, and an AI critic for that topic roasts it in character. Then everyone votes on the roasts. The humor stays, but the joke is now about your own work instead of a random photo.

- **A critic for each topic:** cooking gets a hot-tempered TV chef, drawings get a snobby gallery curator, dorm rooms get an over-the-top home makeover host, and outfits get a ruthless fashion editor. "Topic of the week" could decide which critic is on duty.
- **Heat level:** you pick how hard you get flamed: Gentle, Medium or Extra crispy.
- **A roast plus one real tip:** every roast ends with one honest suggestion, so your cooking or drawing actually gets better. That gives people a reason to keep posting.
- **Voting:** people vote on whether the roast landed, and maybe on whether the critic was fair. A dish the critic hated but the crowd loved could be the weekly highlight.
- **Builds on what exists:** humor styles become critics, and photo upload, posting and voting stay as they are.

Open questions:
- Is this the new direction for the whole app, or one mode next to photo captions?
- One roast per post, or several critics or heat levels to choose from like today's captions?
- Roast the thing, never the person. What happens with photos that show people? No jokes about bodies or identity.
- Critics are original characters inspired by a type (the fiery TV chef), not real celebrities by name.
- Does the critic also give a score out of 10? That could feed streaks and a "Survived the chef" leaderboard.

### Beyond humor (for discussion with the PM and feedback group)

The app doesn't have to be about humor. It only needs AI-made media that people rate or vote on. Before adding more humor features, decide whether to widen what the captions are for, so people have a reason to come back more than once.

- **Caption helper for your own posts:** the same flow (photo → AI captions → votes), but the styles become tones: funny, aesthetic, wholesome, minimal, witty. Friends vote on which caption you should actually post. People would come back every time they post something.
- **Campus and NYC spot guide:** a photo of a place gets an AI-written tip or mini review, and the community rates how useful or accurate it is.
- **Keep humor as one mode** next to the new direction instead of replacing it.

Open questions:
- What does a vote mean: funnier, more useful, or "I'd post this"?
- Do we keep the name Caption City?
- What would make someone use it more than once a week?

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
