import Link from "next/link";
import { apiGet, type ApiAuditEntry, type ApiChainVerification } from "@/lib/api";
import { AuditTimeline, IntegrityBadge } from "@/components/audit/AuditTimeline";

export default async function CaseAuditPage({ params }: { params: { id: string } }) {
  const entries = (await apiGet<ApiAuditEntry[]>(`/cases/${params.id}/audit`)) ?? [];
  const verification = await apiGet<ApiChainVerification>("/audit/verify");

  return (
    <div className="animate-at-rise">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="at-label">Case · Stage 6</div>
          <h1 className="mt-[5px] font-display text-[1.85rem] font-semibold text-text">Audit trail</h1>
        </div>
        <IntegrityBadge verification={verification} />
      </div>
      <div className="at-card p-6">
        <div className="mb-[18px] text-[.82rem] text-text-muted">
          Tamper-evident log · each entry hashed and chained · this case
        </div>
        <AuditTimeline entries={entries} />
      </div>
      <Link
        href={`/cases/${params.id}/report`}
        className="mt-4 inline-block text-[.82rem] text-text-faint hover:text-gold-deep"
      >
        ← Back to report
      </Link>
    </div>
  );
}
