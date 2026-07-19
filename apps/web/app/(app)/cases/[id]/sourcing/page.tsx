import { SourcingView } from "./sourcing-view";

export default function SourcingPage({ params }: { params: { id: string } }) {
  return (
    <div className="animate-at-rise">
      <div className="mb-6">
        <div className="at-label">Case · Stage 4</div>
        <h1 className="mt-[5px] font-display text-[1.85rem] font-semibold text-text">
          Responsible sourcing
        </h1>
      </div>
      <SourcingView caseId={params.id} />
    </div>
  );
}
