import { apiGet, type ApiAuditEntry, type ApiChainVerification } from "@/lib/api";
import { AuditTimeline, IntegrityBadge } from "@/components/audit/AuditTimeline";
import { ComingSoon } from "@/components/ui/ComingSoon";

export default async function AuditPage() {
  const entries = await apiGet<ApiAuditEntry[]>("/audit");
  // No API configured → fall back to the placeholder (UI still renders).
  if (entries === null) return <ComingSoon titleKey="nav.audit" />;

  const verification = await apiGet<ApiChainVerification>("/audit/verify");
  const newestFirst = [...entries].reverse();

  return (
    <div className="animate-at-rise">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="at-label">Tamper-evident log</div>
          <h1 className="mt-[5px] font-display text-[1.85rem] font-semibold text-text">Audit</h1>
        </div>
        <IntegrityBadge verification={verification} />
      </div>
      <div className="at-card p-6">
        <div className="mb-[18px] text-[.82rem] text-text-muted">
          Append-only · each entry hashed and chained · workspace-wide activity
        </div>
        <AuditTimeline entries={newestFirst} />
      </div>
    </div>
  );
}
