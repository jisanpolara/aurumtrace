"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand/Logo";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--at-ink)",
  border: "1px solid var(--at-ink-hairline)",
  borderRadius: 10,
  padding: "12px 14px",
  color: "var(--at-on-ink)",
  fontFamily: "inherit",
  fontSize: ".92rem",
  outline: "none",
};

type Step = "credentials" | "mfa";

export default function SupabaseSignIn() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function finishOrChallengeMfa() {
    // If the account has a verified TOTP factor, Supabase requires AAL2.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totp = factors?.totp?.[0];
      if (totp) {
        setFactorId(totp.id);
        setStep("mfa");
        return;
      }
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        return;
      }
      await finishOrChallengeMfa();
    } catch {
      setError("Sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setError(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) {
        setError(error.message);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="relative flex h-screen w-full items-center justify-center overflow-hidden"
      style={{ background: "radial-gradient(120% 90% at 50% 0%, #21242E 0%, #16181D 60%)" }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-[-120px] h-[520px] w-[520px] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(circle,rgba(201,162,75,.16),transparent 65%)" }}
      />
      <div
        className="relative w-[420px] max-w-[92vw] animate-at-rise p-[38px]"
        style={{
          background: "var(--at-ink-panel)",
          border: "1px solid var(--at-ink-hairline)",
          borderRadius: 16,
          boxShadow: "0 30px 80px -30px rgba(0,0,0,.7)",
        }}
      >
        <div className="mb-[6px] flex items-center gap-[11px]">
          <BrandMark size={34} />
          <span className="at-wordmark text-[1.5rem]" style={{ color: "var(--at-on-ink)" }}>
            Aurum<span className="trace">Trace</span>
          </span>
        </div>
        <div className="mb-7 text-[.8rem]" style={{ color: "var(--at-on-ink-muted)" }}>
          Compliance console · DPMS / goAML
        </div>

        {step === "credentials" ? (
          <form className="flex flex-col gap-4" onSubmit={submitCredentials}>
            <label className="block">
              <div className="mb-[7px] text-[.66rem] font-semibold uppercase tracking-label" style={{ color: "var(--at-on-ink-muted)" }}>
                Work email
              </div>
              <input style={inputStyle} type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.ae" />
            </label>
            <label className="block">
              <div className="mb-[7px] text-[.66rem] font-semibold uppercase tracking-label" style={{ color: "var(--at-on-ink-muted)" }}>
                Password
              </div>
              <input style={inputStyle} type="password" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </label>
            {error && <div className="text-[.8rem]" style={{ color: "var(--at-flag)" }}>{error}</div>}
            <button type="submit" disabled={busy} className="at-btn at-btn-primary mt-[6px] w-full" style={{ padding: 13 }}>
              {busy ? "Signing in…" : "Continue"}
            </button>
            <div className="mt-[2px] text-center text-[.78rem]" style={{ color: "var(--at-text-muted)" }}>
              Protected by two-factor verification
            </div>
          </form>
        ) : (
          <form className="flex flex-col gap-[18px]" onSubmit={submitMfa}>
            <div>
              <div className="font-display text-[1.15rem] font-semibold" style={{ color: "var(--at-on-ink)" }}>
                Two-factor verification
              </div>
              <div className="mt-1 text-[.85rem]" style={{ color: "var(--at-on-ink-muted)" }}>
                Enter the 6-digit code from your authenticator app.
              </div>
            </div>
            <input style={{ ...inputStyle, letterSpacing: ".4em", textAlign: "center", fontSize: "1.2rem" }}
              inputMode="numeric" autoComplete="one-time-code" maxLength={6} required
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="••••••" />
            {error && <div className="text-[.8rem]" style={{ color: "var(--at-flag)" }}>{error}</div>}
            <button type="submit" disabled={busy || code.length < 6} className="at-btn at-btn-primary w-full" style={{ padding: 13 }}>
              {busy ? "Verifying…" : "Verify & sign in"}
            </button>
            <button type="button" onClick={() => { setStep("credentials"); setError(null); }}
              className="w-full cursor-pointer border-none bg-transparent text-[.82rem]" style={{ color: "var(--at-on-ink-muted)" }}>
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
