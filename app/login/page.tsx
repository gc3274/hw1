import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import CaptionIcon from "@/components/CaptionIcon";
import { card, focusRing } from "@/components/ui";
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
    <main className="flex flex-1 items-center justify-center px-4 py-12 sm:p-8">
      <div className={`${card} w-full max-w-sm p-6 text-center sm:p-8`}>
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
          <CaptionIcon className="size-7" />
        </span>
        <h1 className="mt-4 text-2xl font-bold">Sign in to Caption City</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Vote on the funniest captions and turn your own photos into posts.
        </p>

        {failed && (
          <div
            role="alert"
            className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          >
            That sign-in didn’t go through. Please try again.
          </div>
        )}

        <div className="mt-6">
          <GoogleSignInButton />
        </div>

        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          We use the name, email, and photo on your Google account to set up your profile.
        </p>

        <Link
          href="/"
          className={`mt-6 inline-block rounded-sm text-sm font-medium text-gray-600 underline-offset-4 hover:text-foreground hover:underline dark:text-gray-400 ${focusRing}`}
        >
          <span aria-hidden="true">← </span>
          Back to the feed
        </Link>
      </div>
    </main>
  );
}
