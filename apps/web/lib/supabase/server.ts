import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./config";

/**
 * Supabase client for Server Components / Server Actions / Route Handlers.
 * Reads the session from cookies. Writing cookies from a Server Component
 * throws — that's expected; the middleware refreshes the session cookie.
 */
export function createSupabaseServerClient() {
  const { url, anonKey } = supabaseEnv();
  const cookieStore = cookies();
  return createServerClient(url as string, anonKey as string, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — the middleware handles the refresh.
        }
      },
    },
  });
}
