/** Format integer fils as an AED amount (no symbol), matching the design. */
export function aedFromFils(value: number | null): string {
  if (value === null) return "—";
  const aed = value / 100;
  return new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: value % 100 === 0 ? 0 : 2,
  }).format(aed);
}
