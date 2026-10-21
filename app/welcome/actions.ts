"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GUEST_COOKIE, GUEST_COOKIE_MAX_AGE } from "@/lib/guest";

// "Browse as a guest": remember the choice so "/" opens the feed from now on
export async function continueAsGuest() {
  (await cookies()).set(GUEST_COOKIE, "1", {
    maxAge: GUEST_COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  redirect("/");
}
