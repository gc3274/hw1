import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import BlurText from "@/components/bits/BlurText";
import CaptionIcon from "@/components/CaptionIcon";
import AuroraBackdrop from "@/components/fx/AuroraBackdrop";
import PageTransition from "@/components/PageTransition";
import { card, errorBox, focusRing } from "@/components/ui";
import { getUser } from "@/lib/dal";
import GoogleSignInButton from "./GoogleSignInButton";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getUser()) redirect("/");

  // Only used as a flag; the raw value is never shown
  const { error } = await searchParams;
  const failed = Boolean(error);

  return (
    <PageTransition>
      <main className="relative isolate flex flex-1 items-center justify-center overflow-hidden px-4 py-16 sm:p-8">
        <AuroraBackdrop />
        <div className={`${card} relative w-full max-w-sm bg-ink/60! p-6 text-center backdrop-blur-xl sm:p-8`}>
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-lime/15 text-lime">
            <CaptionIcon className="size-7" />
          </span>
          <BlurText
            as="h1"
            text="Sign in to Caption City"
            delay={80}
            className="mt-4 justify-center font-display text-2xl font-bold tracking-tight"
          />
          <p className="mt-2 text-sm text-muted">
            Vote on the funniest captions and turn your own photos into posts.
          </p>

          {failed && (
            <div role="alert" className={`${errorBox} mt-6 text-left`}>
              That sign-in didn’t go through. Please try again.
            </div>
          )}

          <div className="mt-6">
            <GoogleSignInButton />
          </div>

          <p className="mt-4 text-xs text-muted">
            We use the name, email, and photo on your Google account to set up your profile.
          </p>

          <Link
            href="/"
            className={`mt-6 inline-block rounded-sm text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline ${focusRing}`}
          >
            <span aria-hidden="true">← </span>
            Back to the feed
          </Link>
        </div>
      </main>
    </PageTransition>
  );
}
