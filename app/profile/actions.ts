"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/dal";
import {
  AVATAR_BUCKET,
  isOwnAvatarPath,
  parseProfileForm,
  type FormState,
} from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  const parsed = parseProfileForm(formData);
  if (!parsed.ok) {
    return { ok: false, message: "Please fix the highlighted fields.", errors: parsed.errors };
  }
  const { first_name, last_name, bio } = parsed.values;

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, first_name, last_name, bio: bio || null }, { onConflict: "id" });

  if (error) {
    console.error("Profile save failed:", error.message);
    return { ok: false, message: "Couldn't save your profile. Please try again." };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved." };
}

// The browser uploads straight to Storage; only the object path comes through here.
export async function saveAvatar(
  path: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  if (!isOwnAvatarPath(user.id, path)) return { ok: false, error: "Invalid upload." };

  const supabase = await createClient();
  const bucket = supabase.storage.from(AVATAR_BUCKET);

  let found = false;
  try {
    const { data } = await bucket.exists(path);
    found = data;
  } catch {
    found = false;
  }
  if (!found) return { ok: false, error: "Upload not found. Please try again." };

  const { data: current } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .maybeSingle<{ avatar_path: string | null }>();
  const previous = current?.avatar_path ?? null;

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, avatar_path: path }, { onConflict: "id" });

  if (error) {
    console.error("Avatar save failed:", error.message);
    return { ok: false, error: "Couldn't save your photo." };
  }

  if (previous && previous !== path && isOwnAvatarPath(user.id, previous)) {
    try {
      const { error: removeError } = await bucket.remove([previous]);
      if (removeError) console.warn("Old avatar cleanup failed:", removeError.message);
    } catch (err) {
      console.warn("Old avatar cleanup failed:", err instanceof Error ? err.message : err);
    }
  }

  revalidatePath("/", "layout");
  return { ok: true };
}
