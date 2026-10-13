import Link from "next/link";
import BlurText from "@/components/bits/BlurText";
import AuroraBackdrop from "@/components/fx/AuroraBackdrop";
import type { Profile } from "@/lib/dal";
import { button } from "./ui";

// Short signed-in header band on the feed: greeting and the one next step
export default function WelcomeBand({ profile }: { profile: Profile }) {
  const complete = profile.isComplete;
  const title = complete
    ? `Welcome back, ${profile.firstName || profile.displayName}`
    : "You’re almost in";
  const body = complete
    ? "Got a photo? Turn it into a post."
    : "Add your name to finish setting up, then post your first photo.";

  return (
    <section aria-labelledby="welcome-heading" className="relative isolate overflow-hidden border-b border-line">
      <AuroraBackdrop intensity={0.55} />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-14 sm:flex-row sm:items-end sm:justify-between sm:px-8">
        <div className="min-w-0">
          <BlurText
            as="h1"
            id="welcome-heading"
            text={title}
            delay={80}
            className="font-display text-4xl font-bold tracking-tight wrap-anywhere sm:text-5xl"
          />
          <p className="mt-3 text-fg/80">{body}</p>
        </div>
        <Link href={complete ? "/new" : "/onboarding"} className={button("primary")}>
          {complete ? (
            <>
              New post <span aria-hidden="true">→</span>
            </>
          ) : (
            "Finish setup"
          )}
        </Link>
      </div>
    </section>
  );
}
