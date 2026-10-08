import type { Metadata } from "next";
import Link from "next/link";
import { focusRing } from "@/components/ui";

export const metadata: Metadata = {
  title: "Privacy",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-8">
      <h1 className="text-3xl font-bold">Privacy</h1>
      <p>
        Caption City is a class project. When you sign in with Google, we receive your name,
        email address, and profile photo from your Google account.
      </p>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">What we store</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Your email address and the first name, last name, and bio you enter.</li>
          <li>A profile photo, if you upload one.</li>
          <li>The photos you upload for captioning, kept in our Supabase storage.</li>
          <li>The captions generated for your photos, and the votes you cast.</li>
        </ul>
        <p>
          This is only used to run the app. It is never sold or shared with anyone else, except
          as described below.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Captions and photos</h2>
        <p>
          To write captions, the photo you upload is sent to Google’s Gemini API. Google may
          process it under their API terms.
        </p>
        <p>
          Captions stay private until you post them. Once you post a caption, it and its photo
          are public, and you can unpost it at any time.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Votes</h2>
        <p>Your individual votes are private. Only the totals for each caption are shown.</p>
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
          and your account, profile, photos, and captions will be removed.
        </p>
      </section>
      <Link
        href="/"
        className={`inline-block rounded text-sm text-gray-600 underline-offset-4 hover:underline dark:text-gray-400 ${focusRing}`}
      >
        Back to the feed
      </Link>
    </main>
  );
}
