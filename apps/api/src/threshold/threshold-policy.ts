import type { ThresholdPolicy } from "./threshold-engine";

/**
 * Resolve the reporting-threshold policy.
 *
 * The authoritative value is NOT in code. It is supplied by the operator from
 * the advisor-approved mapping via env (later: a per-tenant policy row editable
 * on the Settings screen). When configured, the determination is `confirmed`.
 *
 * TODO(compliance): docs/goaml-mapping.md §2 lists the DPMS cash threshold as
 * "[ADVISOR TO CONFIRM — commonly cited as AED 55,000]" and the aggregation
 * window as unconfirmed. Until the advisor signs off, we fall back to a clearly
 * PROVISIONAL value so the pilot can run, but every determination made on it is
 * flagged `provisional` (indicative only — never a final regulatory decision).
 */
export function loadThresholdPolicy(env: NodeJS.ProcessEnv = process.env): ThresholdPolicy {
  const thresholdFils = Number(env.DPMS_THRESHOLD_FILS);
  const windowDays = Number(env.DPMS_AGG_WINDOW_DAYS);

  if (Number.isInteger(thresholdFils) && thresholdFils > 0 && Number.isInteger(windowDays) && windowDays > 0) {
    return {
      thresholdFils,
      windowDays,
      confirmed: true,
      source: "configured (operator-supplied, advisor-approved)",
    };
  }

  return {
    thresholdFils: 55_000 * 100, // PROVISIONAL placeholder only — not authoritative
    windowDays: 30, // PROVISIONAL placeholder only — not authoritative
    confirmed: false,
    source: "PROVISIONAL — docs/goaml-mapping.md §2, advisor unconfirmed",
  };
}
