import type { Metadata } from "next";
import Hero from "@/components/Hero";
import type { PreviewRoast } from "@/components/HeroPreview";
import PageTransition from "@/components/PageTransition";
import { onePerImage } from "@/lib/captions";
import { getRoastFeed } from "@/lib/images";

export const metadata: Metadata = {
  title: "Welcome",
};

// Fresh preview cards on every visit
export const dynamic = "force-dynamic";

const PREVIEW_CARDS = 3;
// The feed has one row per critic, so fetch extra to find 3 different photos
const PREVIEW_POOL = 12;

export default async function WelcomePage() {
  const top = await getRoastFeed("top", PREVIEW_POOL, null);
  let picks = onePerImage(top.roasts, PREVIEW_CARDS);
  // A quiet week can leave "top" short; top up with the newest posts
  if (picks.length < PREVIEW_CARDS) {
    const fresh = await getRoastFeed("new", PREVIEW_POOL, null);
    picks = onePerImage([...picks, ...fresh.roasts], PREVIEW_CARDS);
  }
  const preview: PreviewRoast[] = picks.map((r) => ({
    id: r.id,
    content: r.content,
    imageUrl: r.image.url,
    critic: `${r.critic.emoji} ${r.critic.name}`,
    rating: r.rating,
  }));

  return (
    <PageTransition>
      <main className="flex flex-1 flex-col">
        <Hero preview={preview} />
      </main>
    </PageTransition>
  );
}
