"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  // The default scope is "global", which would end sessions on every device
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) console.error("Sign out failed:", error.message);

  revalidatePath("/", "layout");
  redirect("/");
}
