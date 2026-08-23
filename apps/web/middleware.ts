import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseAuth, supabaseEnv } from "./lib/supabase/config";

/**
 * Refreshes the Supabase session cookie on each request (required for SSR auth).
 * No-op when Supabase auth is not configured, so DEMO / dev is unaffected.
 */
export async function middleware(request: NextRequest) {
  if (!isSupabaseAuth()) return NextResponse.next();

  let response = NextResponse.next({ request });
  const { url, anonKey } = supabaseEnv();
  const supabase = createServerClient(url as string, anonKey as string, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  // Touch the session so an expired access token is refreshed into the cookie.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Run on app routes; skip static assets and the demo image folder.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|demo/|.*\\.(?:png|svg|jpg|jpeg|gif|webp|ico)$).*)"],
};
