import type { Metadata } from "next";
import Link from "next/link";
import PageTransition from "@/components/PageTransition";
import { focusRing } from "@/components/ui";

export const metadata: Metadata = {
  title: "Privacy",
};

export default function PrivacyPage() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-2xl space-y-6 p-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Privacy</h1>
        <p>
          Deconstructive Criticism is a class project at Columbia. When you sign in with Google, we
          receive your name, email address, and profile photo from your Google account.
        </p>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">What we store</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>Your email address and the first name, last name, and bio you enter.</li>
            <li>A profile photo, if you upload one.</li>
            <li>
              The photos you post for roasting, the topic you file them under, and any note you add.
            </li>
            <li>
              The roasts, scores and tips the critics write for your photos, and the votes you cast.
            </li>
          </ul>
          <p>
            This is only used to run the app. It is never sold or shared with anyone else, except
            as described below.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Roasts and photos</h2>
          <p>
            To roast a photo, we send it and your note to Google’s Gemini API. Google may process
            it under their API terms.
          </p>
          <p>
            The critics roast the thing you made, never the person. Photos that are mainly of a
            person are turned away.
          </p>
          <p>
            Roasts stay private until you post them. Once you post a roast, it and its photo are
            public, and you can make it private again at any time. Your note is never shown
            publicly.
          </p>
          <p>
            Posts from this app’s earlier caption version are kept but no longer shown. Email us to
            have them deleted.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Votes</h2>
          <p>Other people only ever see the totals for each roast, never who voted.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Who can see what</h2>
          <p>
            The site’s admins can see accounts, posts, notes, roasts and votes so they can keep the
            app running and take things down.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Deleting your data</h2>
          <p>
            Email{" "}
            <a
              href="mailto:gc3274@columbia.edu"
              className={`rounded underline underline-offset-4 ${focusRing}`}
            >
              gc3274@columbia.edu
            </a>{" "}
            and your account, profile, photos, and roasts will be removed.
          </p>
        </section>
        <Link
          href="/"
          className={`inline-block rounded text-sm text-muted underline-offset-4 hover:underline ${focusRing}`}
        >
          Back to roasts
        </Link>
      </main>
    </PageTransition>
  );
}
