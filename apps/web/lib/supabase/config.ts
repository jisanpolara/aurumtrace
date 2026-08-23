/**
 * Supabase auth is active only when both public env vars are set. Otherwise the
 * app falls back to the DEMO / dev-cookie path (see lib/session.ts) so the demo
 * and local development keep working unchanged.
 */
export function supabaseEnv(): { url?: string; anonKey?: string } {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function isSupabaseAuth(): boolean {
  const { url, anonKey } = supabaseEnv();
  return Boolean(url && anonKey);
}
