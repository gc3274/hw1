import type { Metadata } from "next";
import Link from "next/link";
import FourOhFour from "@/components/fx/FourOhFour";
import { button } from "@/components/ui";

export const metadata: Metadata = {
  title: "Not found",
};

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <FourOhFour />
      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">This page took the wrong train</h1>
      <p className="mt-2 text-muted">It was here a second ago. Probably transferred at 96th Street.</p>
      <Link href="/" className={`${button("primary")} mt-8`}>
        Back to the feed
      </Link>
    </main>
  );
}
