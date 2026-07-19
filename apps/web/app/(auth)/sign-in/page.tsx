"use client";

import { useState, useTransition } from "react";
import { BrandMark } from "@/components/brand/Logo";
import { useT } from "@/lib/i18n/provider";
import { completeSignIn } from "./actions";

const CODE = ["4", "9", "2", "7", "·", "·"];

export default function SignInPage() {
  const t = useT();
  const [step, setStep] = useState<1 | 2>(1);
  const [pending, startTransition] = useTransition();

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
          {t("signin.tagline")}
        </div>

        {step === 1 ? (
          <div className="flex flex-col gap-4">
            <label className="block">
              <div
                className="mb-[7px] text-[.66rem] font-semibold uppercase tracking-label"
                style={{ color: "var(--at-on-ink-muted)" }}
              >
                {t("signin.workEmail")}
              </div>
              <input
                style={inputStyle}
                type="email"
                placeholder="you@example.ae"
                autoComplete="email"
              />
            </label>
            <label className="block">
              <div
                className="mb-[7px] text-[.66rem] font-semibold uppercase tracking-label"
                style={{ color: "var(--at-on-ink-muted)" }}
              >
                {t("signin.password")}
              </div>
              <input
                type="password"
                style={inputStyle}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="at-btn at-btn-primary mt-[6px] w-full"
              style={{ padding: 13 }}
            >
              {t("signin.continue")}
            </button>
            <div className="mt-[2px] text-center text-[.78rem]" style={{ color: "var(--at-text-muted)" }}>
              {t("signin.protected")}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-[18px]">
            <div>
              <div className="font-display text-[1.15rem] font-semibold" style={{ color: "var(--at-on-ink)" }}>
                {t("signin.mfaTitle")}
              </div>
              <div className="mt-1 text-[.85rem]" style={{ color: "var(--at-on-ink-muted)" }}>
                {t("signin.mfaSubtitle")}
              </div>
            </div>
            <div className="flex gap-[9px]" dir="ltr">
              {CODE.map((d, i) => {
                const filled = d !== "·";
                return (
                  <div
                    key={i}
                    className="flex aspect-square flex-1 items-center justify-center at-mono text-[1.4rem]"
                    style={{
                      background: "var(--at-ink)",
                      border: `1px solid ${i === 0 ? "var(--at-gold)" : "var(--at-ink-hairline)"}`,
                      borderRadius: 10,
                      color: filled ? "var(--at-on-ink)" : "var(--at-text-muted)",
                      boxShadow: i === 0 ? "0 0 0 3px rgba(201,162,75,.18)" : undefined,
                    }}
                  >
                    {d}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => completeSignIn())}
              className="at-btn at-btn-primary w-full"
              style={{ padding: 13 }}
            >
              {t("signin.verify")}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full cursor-pointer border-none bg-transparent text-[.82rem]"
              style={{ color: "var(--at-on-ink-muted)" }}
            >
              {t("signin.back")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
