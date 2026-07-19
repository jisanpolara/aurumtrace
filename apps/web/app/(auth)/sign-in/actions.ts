"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Step 1 stand-in for Supabase Auth + MFA. Sets the session marker and routes
 * into the app. The real credential + TOTP verification replaces the body here
 * without changing the screen or the routing.
 */
export async function completeSignIn() {
  cookies().set(SESSION_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  redirect("/dashboard");
}
