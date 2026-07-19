import type { ApiAuditEntry, ApiChainVerification } from "@/lib/api";

const EVENT_LABEL: Record<string, string> = {
  "case.created": "Case created",
  "intake.id_scanned": "Emirates ID scanned — fields extracted",
  "screening.run": "Screening run",
  "risk.scored": "Risk scored",
  "threshold.checked": "Threshold checked",
  "sourcing.completed": "Responsible-sourcing completed",
  "document.uploaded": "Document uploaded (encrypted)",
  "report.drafted": "goAML report drafted",
  "report.filed": "goAML report filed",
  "auth.signed_in": "Signed in",
  "auth.signed_out": "Signed out",
};

function dotColor(event: string): string {
  if (event === "threshold.checked" || event === "report.filed") return "var(--at-flag)";
  if (event === "risk.scored" || event === "report.drafted") return "var(--at-gold)";
  return "var(--at-clear)";
}

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Hash-chained, tamper-evident timeline (design Stage 6 / Audit view). */
export function AuditTimeline({ entries }: { entries: ApiAuditEntry[] }) {
  if (entries.length === 0) {
    return <div className="text-[.85rem] text-text-muted">No audit activity yet.</div>;
  }
  return (
    <div className="relative ps-2">
      <div
        className="absolute bottom-2 top-2 w-[2px]"
        style={{ insetInlineStart: 13, background: "var(--at-hairline)" }}
      />
      <div className="flex flex-col">
        {entries.map((e) => (
          <div key={e.id} className="relative flex gap-4 py-[11px]">
            <span
              className="mt-[3px] h-3 w-3 flex-none rounded-full"
              style={{
                background: dotColor(e.event),
                marginInlineStart: 7,
                border: "2px solid var(--at-card)",
                boxShadow: "0 0 0 2px var(--at-hairline)",
                zIndex: 1,
              }}
            />
            <div className="flex flex-1 items-start justify-between gap-4">
              <div>
                <div className="text-[.88rem] font-semibold text-text">
                  {EVENT_LABEL[e.event] ?? e.event}
                </div>
                <div className="text-[.76rem] text-text-faint">
                  {e.actorId ? "Officer action" : "AI / system"}
                </div>
              </div>
              <div className="flex-none text-end">
                <div className="at-mono text-[.76rem] text-text-muted">{fmtTime(e.createdAt)}</div>
                <div className="at-mono text-[.68rem]" style={{ color: "var(--at-gold-deep)" }}>
                  sha·{e.hash.slice(0, 4)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Chain-integrity badge — the inspection-ready signal over the append-only log. */
export function IntegrityBadge({ verification }: { verification: ApiChainVerification | null }) {
  if (!verification) {
    return (
      <span className="at-pill warn">
        <span className="dot" />
        Integrity unavailable
      </span>
    );
  }
  if (verification.ok) {
    return (
      <span className="at-pill clear">
        <span className="dot" />
        Chain verified · {verification.length} entries
      </span>
    );
  }
  return (
    <span className="at-pill flag">
      <span className="dot" />
      Chain broken at #{verification.brokenAt}
    </span>
  );
}
