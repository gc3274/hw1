import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  AVATAR_BUCKET,
  displayName,
  isProfileComplete,
  providerAvatarUrl,
} from "@/lib/profile";

type ProfileRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  avatar_path: string | null;
};

export type Profile = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  avatarPath: string | null;
  avatarUrl: string | null;
  displayName: string;
  isComplete: boolean;
};

// getUser() asks Supabase Auth to validate the token, unlike getSession()
export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

// Null only when signed out. A missing profiles row comes back as an
// incomplete profile so onboarding can recreate it.
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, first_name, last_name, bio, avatar_path")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();
  if (error) throw new Error(`Could not load profile: ${error.message}`);

  const uploadedUrl = data?.avatar_path
    ? supabase.storage.from(AVATAR_BUCKET).getPublicUrl(data.avatar_path).data.publicUrl
    : null;

  return {
    id: user.id,
    email: user.email ?? data?.email ?? null,
    firstName: data?.first_name ?? null,
    lastName: data?.last_name ?? null,
    bio: data?.bio ?? null,
    avatarPath: data?.avatar_path ?? null,
    avatarUrl: uploadedUrl ?? providerAvatarUrl(user.user_metadata),
    displayName: displayName(data?.first_name, data?.last_name, user.email),
    isComplete: isProfileComplete(data),
  };
});

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

// For pages that need a finished profile; sends people to onboarding until
// they've given a first and last name.
export async function requireCompleteProfile(): Promise<{ user: User; profile: Profile }> {
  const user = await requireUser();
  const profile = await getProfile();
  if (!profile?.isComplete) redirect("/onboarding");
  return { user, profile };
}
