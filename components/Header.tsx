import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/auth/actions";
import { getProfile, getUser } from "@/lib/dal";
import Avatar from "./Avatar";
import FootballIcon from "./FootballIcon";
import NavLink from "./NavLink";
import SubmitButton from "./SubmitButton";
import { button, focusRing } from "./ui";

export default function Header() {
  return (
    <header className="border-b border-gray-300 dark:border-gray-700">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-8">
        <Link
          href="/"
          className={`mr-auto inline-flex items-center gap-2 rounded-md text-lg font-bold tracking-tight ${focusRing}`}
        >
          <FootballIcon className="size-6 text-emerald-600 dark:text-emerald-500" />
          Gridiron
        </Link>
        <Suspense fallback={<AccountNavSkeleton />}>
          <AccountNav />
        </Suspense>
      </div>
    </header>
  );
}

function AccountNavSkeleton() {
  return (
    <div aria-hidden="true" className="flex items-center gap-3">
      <span className="size-8 animate-pulse rounded-full bg-gray-200 motion-reduce:animate-none dark:bg-gray-800" />
      <span className="h-8 w-20 animate-pulse rounded-md bg-gray-200 motion-reduce:animate-none dark:bg-gray-800" />
    </div>
  );
}

function SignOutForm() {
  return (
    <form action={signOut}>
      <SubmitButton variant="secondary" size="sm" pendingText="Signing out…">
        Sign out
      </SubmitButton>
    </form>
  );
}

async function AccountNav() {
  const user = await getUser();
  if (!user) {
    return (
      <Link href="/login" className={button("primary", "sm")}>
        Sign in
      </Link>
    );
  }

  // Keep the header usable (at least for signing out) if the profile query fails
  const profile = await getProfile().catch(() => null);
  if (!profile) return <SignOutForm />;

  return (
    <>
      <nav aria-label="Account" className="order-last flex w-full gap-1 sm:order-none sm:w-auto">
        {profile.isComplete ? (
          <>
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/profile">Profile</NavLink>
          </>
        ) : (
          // /profile sends incomplete accounts to onboarding anyway
          <NavLink href="/onboarding">Finish setup</NavLink>
        )}
      </nav>
      <div className="flex min-w-0 items-center gap-3">
        <Avatar src={profile.avatarUrl} name={profile.displayName} size={32} />
        <span className="hidden max-w-40 truncate text-sm font-medium sm:inline">
          {profile.firstName || profile.displayName}
        </span>
        <SignOutForm />
      </div>
    </>
  );
}
