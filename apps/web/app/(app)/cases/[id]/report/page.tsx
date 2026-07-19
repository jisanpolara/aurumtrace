import { ReportView } from "./report-view";

export default function ReportPage({ params }: { params: { id: string } }) {
  return (
    <div className="animate-at-rise">
      <div className="mb-6">
        <div className="at-label">Case · Stage 5</div>
        <h1 className="mt-[5px] font-display text-[1.85rem] font-semibold text-text">goAML report</h1>
      </div>
      <ReportView caseId={params.id} />
    </div>
  );
}
