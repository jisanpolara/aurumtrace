"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/session";
import { isSupabaseAuth } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOut() {
  if (isSupabaseAuth()) {
    const supabase = createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  // Also clear the dev/demo stand-in cookie if present.
  cookies().delete(SESSION_COOKIE);
  redirect("/sign-in");
}
