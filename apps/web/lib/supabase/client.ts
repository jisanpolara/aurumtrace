"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Supabase client for Client Components (sign-in form, MFA enrollment). */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );
}
