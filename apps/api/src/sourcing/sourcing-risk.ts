/**
 * Module 4 — Responsible-sourcing risk. PURE, framework-free, unit-tested.
 *
 * Maps the customer's source declaration + OECD five-step due-diligence
 * completion to a sourcing-risk rating. Transparent and explainable.
 *
 * TODO(compliance): the mapping rules are the pilot default per the OECD Due
 * Diligence Guidance for Responsible Supply Chains of Minerals; the MLRO must
 * confirm the thresholds. Not a regulatory constant — a firm policy.
 */

export type DeclarationType = "customer_owned" | "dealer_sourced" | "unknown";

/** The OECD five steps; true = evidenced/complete for this case. */
export type OecdSteps = {
  managementSystems: boolean; // 1 · establish strong management systems
  riskAssessment: boolean; // 2 · identify & assess supply-chain risk
  riskStrategy: boolean; // 3 · design & implement a response strategy
  audit: boolean; // 4 · independent third-party audit
  reporting: boolean; // 5 · report on supply-chain due diligence
};

export const OECD_STEP_KEYS: (keyof OecdSteps)[] = [
  "managementSystems",
  "riskAssessment",
  "riskStrategy",
  "audit",
  "reporting",
];

export type SourcingRisk = "low" | "medium" | "high";

export type SourcingResult = {
  risk: SourcingRisk;
  completedSteps: number;
  reasons: string[];
  /** Mapping rules are the pilot default pending MLRO confirmation — indicative only. */
  provisional: boolean;
};

export function assessSourcingRisk(facts: {
  declarationType: DeclarationType;
  steps: OecdSteps;
}): SourcingResult {
  const completedSteps = OECD_STEP_KEYS.filter((k) => facts.steps[k]).length;
  const reasons: string[] = [];
  let risk: SourcingRisk;

  if (facts.declarationType === "unknown") {
    risk = "high";
    reasons.push("Source of the gold is undeclared/unknown — provenance cannot be established.");
  } else if (facts.declarationType === "customer_owned") {
    if (completedSteps === 5) {
      risk = "low";
    } else if (completedSteps >= 3) {
      risk = "medium";
    } else {
      risk = "high";
    }
    reasons.push(`Customer-owned declaration with ${completedSteps}/5 OECD steps evidenced.`);
  } else {
    // dealer_sourced — supply-chain DD must be complete to be acceptable.
    risk = completedSteps === 5 ? "medium" : "high";
    reasons.push(`Dealer-sourced with ${completedSteps}/5 OECD steps evidenced.`);
  }

  if (completedSteps < 5) {
    const missing = OECD_STEP_KEYS.filter((k) => !facts.steps[k]);
    reasons.push(`Outstanding OECD steps: ${missing.join(", ")}.`);
  }

  return { risk, completedSteps, reasons, provisional: true };
}
