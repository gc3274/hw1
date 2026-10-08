import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Avatar from "@/components/Avatar";
import { card } from "@/components/ui";
import { getProfile, requireUser } from "@/lib/dal";
import { displayName, suggestNames } from "@/lib/profile";
import OnboardingForm from "./OnboardingForm";

export const metadata: Metadata = {
  title: "Set up your profile",
};

export default async function OnboardingPage() {
  // requireCompleteProfile() would bounce straight back here
  const user = await requireUser();
  const profile = await getProfile();
  if (profile?.isComplete) redirect("/");

  const suggested = suggestNames(user.user_metadata);
  const email = profile?.email ?? user.email ?? null;
  const firstName = profile?.firstName || suggested.firstName;
  const lastName = profile?.lastName || suggested.lastName;

  return (
    <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:p-8">
      <div className={`${card} w-full max-w-lg p-6 sm:p-8`}>
        <div className="flex items-center gap-4">
          <Avatar
            src={profile?.avatarUrl ?? null}
            name={displayName(firstName, lastName, email)}
            size={56}
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Welcome to Caption City</h1>
            {email && (
              <p className="truncate text-sm text-gray-600 dark:text-gray-400">
                Signed in as {email}
              </p>
            )}
          </div>
        </div>
        <p className="mt-6 text-sm text-gray-700 dark:text-gray-300">
          Tell us what to call you. We filled in what Google shared, so change anything you
          like.
        </p>
        <OnboardingForm firstName={firstName} lastName={lastName} bio={profile?.bio ?? ""} />
      </div>
    </main>
  );
}
