"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  submitSourcingAction,
  uploadDocumentAction,
  type OecdSteps,
  type SourcingActionResult,
} from "./actions";
import type { ApiUploadedDocument } from "@/lib/api";

const STEP_LABELS: { key: keyof OecdSteps; label: string }[] = [
  { key: "managementSystems", label: "1 · Establish management systems" },
  { key: "riskAssessment", label: "2 · Identify & assess supply-chain risk" },
  { key: "riskStrategy", label: "3 · Strategy to respond to risk" },
  { key: "audit", label: "4 · Independent third-party audit" },
  { key: "reporting", label: "5 · Report on supply-chain due diligence" },
];

const BAND_COLOR: Record<string, string> = {
  low: "var(--at-clear)",
  medium: "var(--at-gold-deep)",
  high: "var(--at-flag)",
};

export function SourcingView({ caseId }: { caseId: string }) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<SourcingActionResult | null>(null);
  const [declarationType, setDeclarationType] = useState("customer_owned");
  const [steps, setSteps] = useState<OecdSteps>({
    managementSystems: true,
    riskAssessment: true,
    riskStrategy: true,
    audit: false,
    reporting: false,
  });
  const [docs, setDocs] = useState<ApiUploadedDocument[]>([]);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggle = (k: keyof OecdSteps) => setSteps((s) => ({ ...s, [k]: !s[k] }));

  const submit = () =>
    start(async () => setRes(await submitSourcingAction(caseId, { declarationType, steps })));

  const onFile = (file: File) => {
    setUploadErr(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      start(async () => {
        const r = await uploadDocumentAction(caseId, {
          kind: "source_declaration",
          filename: file.name,
          contentBase64: base64,
        });
        if (r.ok) setDocs((d) => [...d, r.doc]);
        else setUploadErr(r.error);
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid grid-cols-[1.3fr_1fr] gap-[18px]">
      {/* OECD checklist + declaration */}
      <div className="at-card p-[22px]">
        <h3 className="m-0 font-display text-[1.08rem] font-semibold text-text">
          OECD five-step due diligence
        </h3>
        <div className="mb-4 mt-1 text-[.8rem] text-text-faint">
          Responsible sourcing of gold · customer-owned declaration
        </div>

        <label className="mb-4 block">
          <span className="at-label mb-[6px] block">Source declaration</span>
          <select
            value={declarationType}
            onChange={(e) => setDeclarationType(e.target.value)}
            className="w-full rounded-[10px] border border-hairline bg-card-alt px-[13px] py-[11px] text-[.9rem] text-text outline-none focus:border-gold"
          >
            <option value="customer_owned">Customer-owned</option>
            <option value="dealer_sourced">Dealer-sourced</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>

        <div className="flex flex-col gap-2">
          {STEP_LABELS.map(({ key, label }) => {
            const on = steps[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                className="flex items-center gap-3 rounded-[11px] border border-hairline p-[13px] text-start"
                style={{ background: "var(--at-card-alt)" }}
              >
                <span
                  className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full text-[.7rem] font-bold"
                  style={
                    on
                      ? { background: "var(--at-gold-gradient)", color: "var(--at-on-gold)" }
                      : { border: "2px solid var(--at-hairline)", color: "var(--at-text-faint)" }
                  }
                >
                  {on ? "✓" : ""}
                </span>
                <span className="text-[.88rem] font-medium text-text">{label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="at-btn at-btn-primary mt-5 w-full"
        >
          {pending ? "Assessing…" : "Assess sourcing risk"}
        </button>
      </div>

      {/* Result + documents */}
      <div className="flex flex-col gap-[18px]">
        <div className="at-card p-[22px]">
          <h3 className="m-0 mb-3 font-display text-[1.02rem] font-semibold text-text">
            Sourcing risk
          </h3>
          {!res && <div className="text-[.85rem] text-text-muted">Assess to rate sourcing risk.</div>}
          {res && !res.ok && (
            <div
              className="rounded-[10px] p-[13px] text-[.85rem]"
              style={{ background: "var(--at-flag-wash)", color: "var(--at-flag)" }}
            >
              {res.error}
            </div>
          )}
          {res && res.ok && (
            <div className="animate-at-rise">
              <div className="flex items-baseline gap-2">
                <span
                  className="font-display text-[1.9rem] font-bold capitalize"
                  style={{ color: BAND_COLOR[res.result.risk] }}
                >
                  {res.result.risk}
                </span>
                <span className="text-[.8rem] text-text-faint">
                  {res.result.completedSteps}/5 OECD steps
                </span>
              </div>
              <ul className="mt-2 flex list-none flex-col gap-1 p-0">
                {res.result.reasons.map((r) => (
                  <li key={r} className="text-[.8rem] text-text-muted">
                    · {r}
                  </li>
                ))}
              </ul>
              {res.result.provisional && (
                <div className="mt-2 text-[.7rem]" style={{ color: "var(--at-text-faint)" }}>
                  Provisional rules — pending MLRO confirmation
                </div>
              )}
            </div>
          )}
        </div>

        <div className="at-card p-[22px]">
          <div className="at-label mb-3">Documents</div>
          {docs.map((d) => (
            <div
              key={d.id}
              className="mb-2 flex items-center gap-[11px] rounded-[10px] border border-hairline p-[11px]"
            >
              <span style={{ color: "var(--at-clear)" }}>✓</span>
              <div className="flex-1">
                <div className="text-[.82rem] font-semibold text-text">{d.filename}</div>
                <div className="at-mono text-[.68rem] text-text-faint">
                  sha256 {d.contentHash.slice(0, 12)}… · {d.sizeBytes} B · encrypted
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-[6px] rounded-[10px] p-[18px] text-text-faint"
            style={{ border: "1.5px dashed var(--at-hairline)" }}
          >
            <span style={{ color: "var(--at-gold)" }}>↑</span>
            <span className="text-[.8rem]">Upload supporting document</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
          {uploadErr && (
            <div className="mt-2 text-[.78rem]" style={{ color: "var(--at-flag)" }}>
              {uploadErr}
            </div>
          )}
        </div>

        {res?.ok && (
          <Link href={`/cases/${caseId}/report`} className="at-btn at-btn-primary w-full">
            Continue to goAML report →
          </Link>
        )}
        <Link href={`/cases/${caseId}/kyc`} className="text-center text-[.82rem] text-text-faint hover:text-gold-deep">
          ← Back to KYC
        </Link>
      </div>
    </div>
  );
}
