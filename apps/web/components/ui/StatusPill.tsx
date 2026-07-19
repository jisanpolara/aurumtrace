/** Status pill: clear (green) · flag (red) · warn (gold). */
export type PillTone = "clear" | "flag" | "warn";

export function StatusPill({
  tone,
  label,
  withDot = true,
}: {
  tone: PillTone;
  label: string;
  withDot?: boolean;
}) {
  return (
    <span className={`at-pill ${tone}`}>
      {withDot ? <span className="dot" /> : null}
      {label}
    </span>
  );
}
