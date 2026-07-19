import { cookies } from "next/headers";

/**
 * DEV-ONLY stand-in session for the web UI gate.
 *
 * This cookie only routes the browser to screens that render MOCK data. It is
 * NOT a security boundary: real tenant data is reachable solely through the API
 * (apps/api), which requires a verified Supabase JWT and enforces tenant RLS in
 * Postgres. When the web app starts consuming that API, this stand-in is
 * replaced by a real Supabase session (see apps/web/.env.example).
 */
export const SESSION_COOKIE = "at_session";

/** Hosted open demo (no login): the gate is always open. See apps/api DEMO_MODE. */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true";
}

export function hasSession(): boolean {
  if (isDemoMode()) return true;
  return cookies().get(SESSION_COOKIE)?.value === "1";
}
