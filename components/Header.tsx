import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/auth/actions";
import ShinyText from "@/components/bits/ShinyText";
import { getProfile, getUser } from "@/lib/dal";
import { GUEST_COOKIE } from "@/lib/guest";
import type { NavItem } from "@/lib/nav";
import Avatar from "./Avatar";
import CaptionIcon from "./CaptionIcon";
import HeaderShell from "./HeaderShell";
import MainNav from "./MainNav";
import SubmitButton from "./SubmitButton";
import { button, focusRing } from "./ui";

const FEED: NavItem = { href: "/", label: "Feed", exact: true };
const ROAST: NavItem = { href: "/roast", label: "Roast" };

export default function Header() {
  return (
    <HeaderShell>
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-8">
        <Link
          href="/"
          className={`mr-auto inline-flex items-center gap-2 rounded-md font-display text-lg font-bold tracking-tight ${focusRing}`}
        >
          <CaptionIcon className="size-6 text-lime" />
          <ShinyText text="Caption City" color="#f4f4f6" shineColor="#c4ff3d" speed={2.5} delay={4} />
        </Link>
        <Suspense fallback={<AccountNavSkeleton />}>
          <AccountNav />
        </Suspense>
      </div>
    </HeaderShell>
  );
}

function AccountNavSkeleton() {
  return (
    <div aria-hidden="true" className="flex items-center gap-3">
      <span className="size-8 animate-pulse rounded-full bg-white/10 motion-reduce:animate-none" />
      <span className="h-8 w-20 animate-pulse rounded-md bg-white/10 motion-reduce:animate-none" />
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
    // First-time visitors are sent from "/" to /welcome, so Feed is only offered to guests
    const isGuest = (await cookies()).has(GUEST_COOKIE);
    return (
      <>
        {isGuest && <MainNav items={[FEED, ROAST]} />}
        <Link href="/login" className={button("primary", "sm")}>
          Sign in
        </Link>
      </>
    );
  }

  // Keep the header usable (at least for signing out) if the profile query fails
  const profile = await getProfile().catch(() => null);
  if (!profile) return <SignOutForm />;

  return (
    <>
      {profile.isComplete ? (
        <MainNav
          className="order-last w-full sm:order-none sm:w-auto"
          items={[
            FEED,
            ROAST,
            { href: "/new", label: "New post" },
            { href: "/dashboard", label: "Dashboard" },
            { href: "/profile", label: "Profile" },
          ]}
        />
      ) : (
        // /profile sends incomplete accounts to onboarding anyway
        <MainNav
          className="order-last w-full sm:order-none sm:w-auto"
          items={[FEED, ROAST, { href: "/onboarding", label: "Finish setup" }]}
        />
      )}
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
