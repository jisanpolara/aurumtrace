import { cookies } from "next/headers";
import { isSupabaseAuth } from "./supabase/config";
import { createSupabaseServerClient } from "./supabase/server";

/**
 * Session gate for the web UI. Three modes, checked in order:
 *  1. DEMO_MODE  — hosted open demo, gate always open (sample data only).
 *  2. Supabase   — real auth: a verified Supabase user is required.
 *  3. dev cookie — local stand-in (`at_session`) for development.
 *
 * This is only the UI gate. Real tenant data is reachable solely through the API,
 * which verifies the Supabase JWT and enforces tenant RLS in Postgres.
 */
export const SESSION_COOKIE = "at_session";

/** Hosted open demo (no login): the gate is always open. See apps/api DEMO_MODE. */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true";
}

export async function hasSession(): Promise<boolean> {
  if (isDemoMode()) return true;
  if (isSupabaseAuth()) {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    return Boolean(data.user);
  }
  return cookies().get(SESSION_COOKIE)?.value === "1";
}
