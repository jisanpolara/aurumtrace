import { z } from "zod";

/**
 * Money is stored and computed in **integer minor units (fils)** — never floats
 * (CLAUDE.md). 1 AED = 100 fils. Display formatting happens only at the edge.
 */
export const Fils = z
  .number()
  .int("amount must be an integer number of fils")
  .nonnegative("amount must be >= 0")
  .brand<"Fils">();

export type Fils = z.infer<typeof Fils>;

export const FILS_PER_AED = 100;

/** Construct a Fils value from a validated integer. */
export function fils(n: number): Fils {
  return Fils.parse(n);
}

/** Convert a whole/decimal AED figure to fils. Rejects sub-fil precision. */
export function aedToFils(aed: number): Fils {
  const scaled = Math.round(aed * FILS_PER_AED);
  if (Math.abs(aed * FILS_PER_AED - scaled) > 1e-9) {
    throw new Error(`AED value ${aed} has sub-fil precision`);
  }
  return fils(scaled);
}

/** Format fils as an AED string with thousands separators (UAE English). */
export function formatAed(value: Fils, opts: { withSymbol?: boolean } = {}): string {
  const aed = value / FILS_PER_AED;
  const body = new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: aed % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(aed);
  return opts.withSymbol ? `AED ${body}` : body;
}

// TODO(compliance): The DPMS cash reporting threshold is NOT advisor-confirmed
// (docs/goaml-mapping.md §2 lists it as "[ADVISOR TO CONFIRM — commonly cited as
// AED 55,000]"). Do not hard-code a regulatory value here. The threshold engine
// (Step 5) must read the confirmed amount + covered transaction types from the
// approved mapping once the advisor signs off, not from a constant in code.
