"use client";

import DevSignIn from "./DevSignIn";
import SupabaseSignIn from "./SupabaseSignIn";

// NEXT_PUBLIC_* is inlined at build time, so this is a stable per-build constant.
const SUPABASE_AUTH = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export default function SignInPage() {
  return SUPABASE_AUTH ? <SupabaseSignIn /> : <DevSignIn />;
}
