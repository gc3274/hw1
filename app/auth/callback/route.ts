import type { NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isProfileComplete } from "@/lib/profile";

// redirect() here sends a relative Location and keeps the session cookies set
// through cookies(), so preview deployments stay on their own host.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const providerError = params.get("error_description") ?? params.get("error");
  const code = params.get("code");

  if (providerError) redirect(`/login?error=${encodeURIComponent(providerError.slice(0, 200))}`);
  if (!code) redirect("/login?error=missing_code");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "sign_in_failed")}`);
  }

  // The trigger on auth.users has already created the profiles row by now
  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", data.user.id)
    .maybeSingle<{ first_name: string | null; last_name: string | null }>();

  redirect(isProfileComplete(profile) ? "/" : "/onboarding");
}
