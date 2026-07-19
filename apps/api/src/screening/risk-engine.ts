/**
 * Module 2 — KYC/CDD risk scoring. PURE, framework-free, fully unit-tested.
 *
 * Transparent, rule-based model: a baseline plus documented factor weights,
 * each returned with its points so the score is fully explainable (no opaque
 * model). A sanctions match forces High regardless of score.
 *
 * TODO(compliance): the factor WEIGHTS and band cut-offs are the pilot default
 * methodology and must be calibrated/approved by the MLRO/compliance advisor
 * (FATF risk factors + docs/goaml-mapping.md). They are a firm risk model, not a
 * regulatory constant, but should not be treated as final until signed off.
 */

export type ScreeningFacts = {
  sanctionsMatch: boolean;
  pepMatch: boolean;
  adverseMedia: boolean;
  identityVerified: boolean;
};

export type RiskFacts = {
  screening: ScreeningFacts;
  /** Reporting-threshold determination for this case (from Module 3). */
  reportable: boolean;
  /** Number of linked transactions counted (>1 means prior activity in window). */
  linkedCount: number;
  residency: "resident" | "non_resident" | null;
  /** Customer tenure in months (null if unknown/new). */
  customerTenureMonths: number | null;
};

export type RiskBand = "low" | "medium" | "high";
export type RiskFactor = { code: string; label: string; points: number };

export type RiskResult = {
  score: number; // 0..100
  band: RiskBand;
  factors: RiskFactor[];
  /** True when a hard rule (sanctions match) forced the High band. */
  forcedHigh: boolean;
  /** Weights/bands are the pilot default pending MLRO calibration — indicative only. */
  provisional: boolean;
};

// Pilot weights — TODO(compliance): MLRO to calibrate/approve.
const BASELINE = 30;
const W = {
  pep: 30,
  adverseMedia: 20,
  identityUnverified: 25,
  reportable: 25,
  priorLinked: 10,
  nonResident: 10,
  establishedCustomer: -10,
} as const;
const ESTABLISHED_MONTHS = 36;

/** Band cut-offs (exported for direct boundary testing — calibration-sensitive). */
export function bandFor(score: number): RiskBand {
  if (score >= 67) return "high";
  if (score >= 34) return "medium";
  return "low";
}

export function scoreRisk(facts: RiskFacts): RiskResult {
  const factors: RiskFactor[] = [];
  const add = (code: string, label: string, points: number) =>
    factors.push({ code, label, points });

  // Hard rule: a sanctions match is High regardless of the additive score.
  if (facts.screening.sanctionsMatch) {
    add("sanctions_match", "Sanctions list match", 100);
    return { score: 100, band: "high", factors, forcedHigh: true, provisional: true };
  }

  add("baseline", "Baseline customer due diligence", BASELINE);
  if (facts.screening.pepMatch) add("pep_match", "Politically exposed person match", W.pep);
  if (facts.screening.adverseMedia) add("adverse_media", "Adverse media match", W.adverseMedia);
  if (!facts.screening.identityVerified)
    add("identity_unverified", "Identity not verified", W.identityUnverified);
  if (facts.reportable)
    add("reportable", "Transaction at/above the reporting threshold", W.reportable);
  if (facts.linkedCount > 1)
    add("prior_linked", "Prior linked transaction within the window", W.priorLinked);
  if (facts.residency === "non_resident")
    add("non_resident", "Non-resident customer", W.nonResident);
  if (facts.customerTenureMonths !== null && facts.customerTenureMonths >= ESTABLISHED_MONTHS)
    add("established_customer", "Established customer (long history)", W.establishedCustomer);

  const raw = factors.reduce((sum, f) => sum + f.points, 0);
  const score = Math.max(0, Math.min(100, raw));
  return { score, band: bandFor(score), factors, forcedHigh: false, provisional: true };
}
