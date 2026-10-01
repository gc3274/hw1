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
        Gridiron is a class project. When you sign in with Google, we receive your name, email
        address, and profile photo from your Google account.
      </p>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">What we store</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Your email address and the first name, last name, and bio you enter.</li>
          <li>A profile photo, if you upload one.</li>
        </ul>
        <p>
          This is only used to show your profile and dashboard inside the app. It is never sold
          or shared with anyone else.
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
          and your account, profile, and photo will be removed.
        </p>
      </section>
      <Link
        href="/"
        className={`inline-block rounded text-sm text-gray-600 underline-offset-4 hover:underline dark:text-gray-400 ${focusRing}`}
      >
        Back to players
      </Link>
    </main>
  );
}
