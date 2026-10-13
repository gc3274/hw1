import Link from "next/link";
import type { ReactNode } from "react";
import GoogleSignInButton from "@/app/login/GoogleSignInButton";
import BlurText from "@/components/bits/BlurText";
import AuroraBackdrop from "@/components/fx/AuroraBackdrop";
import type { Profile } from "@/lib/dal";
import { button, focusRing } from "./ui";

// Short band at the top of the feed: a greeting and the one next step.
// Null profile means a guest who chose to look around.
export default function WelcomeBand({ profile }: { profile: Profile | null }) {
  if (!profile) {
    return (
      <Band
        title="You’re looking around as a guest"
        body="Sign in to vote on the funniest captions and post your own photos."
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-64">
            <GoogleSignInButton />
          </div>
          <Link
            href="/welcome"
            className={`rounded-sm text-sm font-medium text-muted underline-offset-4 hover:text-fg hover:underline ${focusRing}`}
          >
            How it works
          </Link>
        </div>
      </Band>
    );
  }

  if (!profile.isComplete) {
    return (
      <Band title="You’re almost in" body="Add your name to finish setting up, then post your first photo.">
        <Link href="/onboarding" className={button("primary")}>
          Finish setup
        </Link>
      </Band>
    );
  }

  return (
    <Band
      title={`Welcome back, ${profile.firstName || profile.displayName}`}
      body="Got a photo? Turn it into a post."
    >
      <Link href="/new" className={button("primary")}>
        New post <span aria-hidden="true">→</span>
      </Link>
    </Band>
  );
}

function Band({ title, body, children }: { title: string; body: string; children: ReactNode }) {
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
        {children}
      </div>
    </section>
  );
}
