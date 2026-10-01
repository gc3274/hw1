import type { Metadata } from "next";
import Link from "next/link";
import { button, card, focusRing } from "@/components/ui";
import { requireCompleteProfile } from "@/lib/dal";
import AvatarUploader from "./AvatarUploader";
import ProfileForm from "./ProfileForm";

export const metadata: Metadata = {
  title: "Your profile",
};

export default async function ProfilePage() {
  const { user, profile } = await requireCompleteProfile();
  const email = profile.email ?? user.email;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:p-8">
      <Link
        href="/dashboard"
        className={`mb-4 inline-flex items-center gap-1 rounded text-sm text-gray-600 underline-offset-4 hover:underline dark:text-gray-400 ${focusRing}`}
      >
        <span aria-hidden="true">←</span> Back to dashboard
      </Link>
      <h1 className="text-3xl font-bold">Your profile</h1>
      {email && (
        <p className="mt-1 text-sm break-words text-gray-600 dark:text-gray-400">
          Signed in with Google as {email}
        </p>
      )}

      <section aria-labelledby="photo-heading" className={`${card} mt-8 p-4 sm:p-6`}>
        <h2 id="photo-heading" className="text-lg font-semibold">
          Photo
        </h2>
        <AvatarUploader
          userId={user.id}
          currentUrl={profile.avatarUrl}
          name={profile.displayName}
          usingGooglePhoto={!profile.avatarPath}
        />
      </section>

      <section aria-labelledby="details-heading" className={`${card} mt-6 p-4 sm:p-6`}>
        <h2 id="details-heading" className="text-lg font-semibold">
          Details
        </h2>
        <ProfileForm
          firstName={profile.firstName ?? ""}
          lastName={profile.lastName ?? ""}
          bio={profile.bio ?? ""}
        />
      </section>

      <div className="mt-6 flex justify-end">
        <Link href="/dashboard" className={button("secondary")}>
          Done, back to dashboard
        </Link>
      </div>
    </main>
  );
}
