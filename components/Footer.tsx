import Link from "next/link";
import { focusRing } from "./ui";

const linkClass = `rounded-sm underline-offset-4 hover:text-foreground hover:underline ${focusRing}`;

export default function Footer() {
  return (
    <footer className="border-t border-line text-sm text-muted">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 sm:px-8">
        <nav aria-label="Footer" className="mr-auto flex gap-4">
          <Link href="/privacy" className={linkClass}>
            Privacy
          </Link>
        </nav>
        <p>© Deconstructive Criticism</p>
      </div>
    </footer>
  );
}
