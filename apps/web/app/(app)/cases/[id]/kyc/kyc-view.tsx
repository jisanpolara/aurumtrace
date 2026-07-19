"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { runScreeningAction, type ScreeningActionResult } from "./actions";

const BAND_COLOR: Record<string, string> = {
  low: "var(--at-clear)",
  medium: "var(--at-gold-deep)",
  high: "var(--at-flag)",
};

type Check = { label: string; sub: string; ok: boolean; okText: string; badText: string };

export function KycView({ caseId }: { caseId: string }) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<ScreeningActionResult | null>(null);

  const run = () => start(async () => setRes(await runScreeningAction(caseId)));

  return (
    <div className="grid grid-cols-[1.4fr_1fr] gap-[18px]">
      {/* Screening checks */}
      <div className="at-card p-[22px]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="m-0 font-display text-[1.08rem] font-semibold text-text">Screening</h3>
          <button type="button" onClick={run} disabled={pending} className="at-btn at-btn-primary">
            {pending ? "Running…" : res?.ok ? "Re-run" : "Run screening & risk"}
          </button>
        </div>

        {!res && (
          <div className="text-[.85rem] text-text-muted">
            Run sanctions, PEP and adverse-media screening and score the customer&apos;s risk.
          </div>
        )}
        {res && !res.ok && (
          <div
            className="rounded-[10px] p-[13px] text-[.85rem]"
            style={{ background: "var(--at-flag-wash)", color: "var(--at-flag)" }}
          >
            {res.error}
          </div>
        )}
        {res && res.ok && (
          <div className="flex animate-at-rise flex-col gap-[10px]">
            {(
              [
                { label: "Sanctions lists", sub: "UN, OFAC, UK, EU, UAE Local Terrorist List", ok: !res.result.screening.sanctionsMatch, okText: "No match", badText: "Match" },
                { label: "Politically exposed person", sub: "Domestic & foreign PEP databases", ok: !res.result.screening.pepMatch, okText: "No match", badText: "Match" },
                { label: "Adverse media", sub: "AI scan of public sources", ok: !res.result.screening.adverseMedia, okText: "Clear", badText: "Found" },
                { label: "Identity verified", sub: "Emirates ID biometric · liveness", ok: res.result.screening.identityVerified, okText: "Verified", badText: "Unverified" },
              ] as Check[]
            ).map((c) => (
              <div
                key={c.label}
                className="flex items-center gap-[13px] rounded-[12px] border border-hairline p-[14px]"
                style={{ background: "var(--at-card-alt)" }}
              >
                <span
                  className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-[.7rem] font-bold"
                  style={
                    c.ok
                      ? { background: "var(--at-gold-gradient)", color: "var(--at-on-gold)" }
                      : { background: "var(--at-flag-wash)", color: "var(--at-flag)" }
                  }
                >
                  {c.ok ? "✓" : "!"}
                </span>
                <div className="flex-1">
                  <div className="text-[.9rem] font-semibold text-text">{c.label}</div>
                  <div className="text-[.78rem] text-text-faint">{c.sub}</div>
                </div>
                <span
                  className="text-[.74rem] font-bold"
                  style={{ color: c.ok ? "var(--at-clear)" : "var(--at-flag)" }}
                >
                  {c.ok ? c.okText : c.badText}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Risk score */}
      <div className="at-card p-[22px]">
        <h3 className="m-0 mb-4 font-display text-[1.08rem] font-semibold text-text">Risk score</h3>
        {!res?.ok ? (
          <div className="text-[.85rem] text-text-muted">Run screening to compute the risk score.</div>
        ) : (
          <div className="animate-at-rise">
            <div className="flex flex-col items-center pb-4">
              <div
                className="flex h-[130px] w-[130px] items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(var(--at-gold) 0 ${res.result.risk.score}%, #EEE9DC ${res.result.risk.score}% 100%)`,
                }}
              >
                <div className="flex h-[100px] w-[100px] flex-col items-center justify-center rounded-full bg-card">
                  <span
                    className="font-display text-[1.4rem] font-bold capitalize"
                    style={{ color: BAND_COLOR[res.result.risk.band] }}
                  >
                    {res.result.risk.band}
                  </span>
                  <span className="text-[.72rem] text-text-faint">
                    score {res.result.risk.score} / 100
                  </span>
                </div>
              </div>
              {res.result.risk.forcedHigh && (
                <div className="mt-2 text-[.74rem] font-semibold" style={{ color: "var(--at-flag)" }}>
                  Sanctions match — escalated to High
                </div>
              )}
              {res.result.risk.provisional && (
                <div className="mt-1 text-[.7rem]" style={{ color: "var(--at-text-faint)" }}>
                  Provisional methodology — pending MLRO calibration
                </div>
              )}
            </div>
            <div className="at-label mb-[10px]">Reasons</div>
            <div className="flex flex-col gap-[9px]">
              {res.result.risk.factors.map((f) => (
                <div key={f.code} className="flex items-start justify-between gap-3 text-[.83rem]">
                  <span className="text-text">{f.label}</span>
                  <span
                    className="at-mono flex-none font-semibold"
                    style={{ color: f.points >= 0 ? "var(--at-gold-deep)" : "var(--at-clear)" }}
                  >
                    {f.points > 0 ? `+${f.points}` : f.points}
                  </span>
                </div>
              ))}
            </div>
            <Link href={`/cases/${caseId}/sourcing`} className="at-btn at-btn-primary mt-5 w-full">
              Continue to sourcing →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
