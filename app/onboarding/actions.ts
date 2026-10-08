"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { parseProfileForm, type FormState } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export async function completeOnboarding(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();

  const parsed = parseProfileForm(formData);
  if (!parsed.ok) {
    return { ok: false, message: "Please fix the highlighted fields.", errors: parsed.errors };
  }
  const { first_name, last_name, bio } = parsed.values;

  // Upsert so a missing profiles row gets recreated instead of failing
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      first_name,
      last_name,
      bio: bio || null,
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("Onboarding save failed:", error.message);
    return { ok: false, message: "Couldn't save your profile. Please try again." };
  }

  revalidatePath("/", "layout");
  redirect("/");
}
