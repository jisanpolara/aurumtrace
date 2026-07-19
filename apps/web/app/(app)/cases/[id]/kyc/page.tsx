import { KycView } from "./kyc-view";

export default function KycPage({ params }: { params: { id: string } }) {
  return (
    <div className="animate-at-rise">
      <div className="mb-6">
        <div className="at-label">Case · Stage 2</div>
        <h1 className="mt-[5px] font-display text-[1.85rem] font-semibold text-text">KYC / CDD</h1>
      </div>
      <KycView caseId={params.id} />
    </div>
  );
}
