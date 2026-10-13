"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GUEST_COOKIE } from "@/lib/guest";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  // The default scope is "global", which would end sessions on every device
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) console.error("Sign out failed:", error.message);

  revalidatePath("/", "layout");
  // Non-guests go straight to /welcome; via "/" they'd see it under the feed's URL
  redirect((await cookies()).has(GUEST_COOKIE) ? "/" : "/welcome");
}
