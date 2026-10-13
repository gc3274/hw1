import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Hero from "@/components/Hero";
import PageTransition from "@/components/PageTransition";
import { getUser } from "@/lib/dal";
import { getFeed } from "@/lib/images";

export const metadata: Metadata = {
  title: "Welcome",
};

// Fresh preview cards on every visit
export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  if (await getUser()) redirect("/");

  const top = await getFeed("top", 3);
  // A quiet week can leave "top" empty; fall back to the newest posts
  const feed = top.captions.length > 0 ? top : await getFeed("new", 3);
  const preview = feed.captions.map((c) => ({
    id: c.id,
    content: c.content,
    imageUrl: c.image.url,
    flavor: c.flavor.name,
  }));

  return (
    <PageTransition>
      <main className="flex flex-1 flex-col">
        <Hero preview={preview} />
      </main>
    </PageTransition>
  );
}
