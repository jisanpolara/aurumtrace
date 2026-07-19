"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  draftReportAction,
  fileReportAction,
  type DraftActionResult,
} from "./actions";

export function ReportView({ caseId }: { caseId: string }) {
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<DraftActionResult | null>(null);
  const [filed, setFiled] = useState<string | null>(null);
  const [fileErr, setFileErr] = useState<string | null>(null);

  const generate = () =>
    start(async () => {
      setFiled(null);
      setFileErr(null);
      setDraft(await draftReportAction(caseId));
    });

  const fileReport = (reportId: string) =>
    start(async () => {
      const r = await fileReportAction(reportId);
      if (r.ok) setFiled(r.filed.filedAt);
      else setFileErr(r.error);
    });

  if (!draft) {
    return (
      <div className="at-card p-6">
        <p className="m-0 mb-4 text-[.9rem] text-text-muted">
          Generate the goAML DPMSR draft from this case. Nothing is filed automatically — you
          review the draft, then file it to the FIU portal yourself.
        </p>
        <button type="button" onClick={generate} disabled={pending} className="at-btn at-btn-primary">
          {pending ? "Drafting…" : "Generate goAML draft"}
        </button>
      </div>
    );
  }

  if (!draft.ok) {
    return (
      <div className="at-card p-6" style={{ background: "var(--at-flag-wash)" }}>
        <div className="text-[.9rem]" style={{ color: "var(--at-flag)" }}>{draft.error}</div>
      </div>
    );
  }

  const d = draft.draft;
  return (
    <div className="grid animate-at-rise grid-cols-[1.5fr_1fr] items-start gap-[18px]">
      {/* XML preview + narrative */}
      <div className="at-card overflow-hidden" style={{ background: "var(--at-card-alt)" }}>
        <div
          className="flex items-center justify-between px-[18px] py-[13px]"
          style={{ background: "var(--at-ink)" }}
        >
          <span className="at-mono text-[.78rem]" style={{ color: "var(--at-on-ink-muted)" }}>
            goAML · DPMSR draft
          </span>
          <span className="at-mono text-[.78rem]" style={{ color: "var(--at-gold-light)" }}>
            {d.reference}
          </span>
        </div>
        {d.provisional && (
          <div
            className="px-[18px] py-2 text-[.74rem] font-semibold"
            style={{ background: "var(--at-warn-wash)", color: "var(--at-gold-deep)" }}
          >
            PROVISIONAL — mapping pending advisor confirmation. Not for filing as-is.
          </div>
        )}
        <pre
          className="at-mono m-0 overflow-x-auto px-[20px] py-[18px] text-[.76rem] leading-relaxed text-text"
          style={{ whiteSpace: "pre" }}
        >
          {d.xml}
        </pre>
        <div className="px-[20px] pb-5">
          <div className="at-label mb-2">Plain-language narrative</div>
          <div
            className="rounded-[10px] border border-hairline p-[13px] text-[.85rem] leading-relaxed text-text"
            style={{ background: "var(--at-card)" }}
          >
            {d.narrative}
          </div>
        </div>
      </div>

      {/* Readiness + file */}
      <div className="flex flex-col gap-[18px]">
        <div className="at-card p-[22px]">
          <div className="at-label mb-[14px]">Report readiness</div>
          <Check ok={d.validation.valid} label="All required fields populated" />
          <Check ok={d.validation.valid} label="Structurally validated (provisional)" />
          <Check ok={d.narrative.length > 0} label="Narrative drafted for review" />
        </div>

        {filed ? (
          <div
            className="at-card p-[20px] text-[.85rem]"
            style={{ background: "var(--at-clear-wash)", color: "var(--at-clear)" }}
          >
            ✓ Filed for the record at {new Date(filed).toLocaleString("en-GB")}. Submit the XML to
            the FIU goAML portal to complete the filing.
          </div>
        ) : (
          <div
            className="at-card p-5"
            style={{ background: "var(--at-gold-wash)", border: "1px solid var(--at-gold-light)" }}
          >
            <div className="mb-[14px] text-[.85rem] leading-relaxed" style={{ color: "#6E5A2A" }}>
              Nothing is filed automatically. Review the draft, then record the filing and upload to
              the FIU goAML portal.
            </div>
            <button
              type="button"
              onClick={() => fileReport(d.id)}
              disabled={pending}
              className="at-btn at-btn-primary w-full"
            >
              {pending ? "Filing…" : "Review & file report"}
            </button>
            {fileErr && (
              <div className="mt-2 text-[.78rem]" style={{ color: "var(--at-flag)" }}>{fileErr}</div>
            )}
          </div>
        )}

        <Link
          href={`/cases/${caseId}/audit`}
          className="text-center text-[.82rem] text-text-faint hover:text-gold-deep"
        >
          View case audit trail →
        </Link>
      </div>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="mb-[11px] flex items-center gap-[9px] text-[.85rem] text-text">
      <span
        className="flex h-4 w-4 flex-none items-center justify-center rounded-full text-[.6rem] text-white"
        style={{ background: ok ? "var(--at-clear)" : "var(--at-text-faint)" }}
      >
        ✓
      </span>
      {label}
    </div>
  );
}
