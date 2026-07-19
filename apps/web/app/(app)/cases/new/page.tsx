import { IntakeForm } from "./intake-form";

export default function NewCasePage() {
  return (
    <div className="animate-at-rise">
      <div className="mb-6">
        <div className="at-label">New case · Stage 1</div>
        <h1 className="mt-[5px] font-display text-[1.85rem] font-semibold text-text">Intake</h1>
      </div>
      <IntakeForm />
    </div>
  );
}
