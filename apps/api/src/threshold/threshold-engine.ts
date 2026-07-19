/**
 * Module 3 — Reporting-threshold + linked-transaction aggregation.
 *
 * PURE, framework-free, fully unit-tested. It NEVER hard-codes a regulatory
 * value: the threshold amount and aggregation window are supplied via
 * `ThresholdPolicy` (sourced from advisor-approved config — see threshold-policy.ts).
 * When the policy is not advisor-confirmed the result is flagged `provisional`
 * so nothing downstream treats it as a final determination.
 *
 * Source of rules: docs/goaml-mapping.md §2 (Reporting triggers & thresholds).
 * All money is integer fils; comparisons are integer (no floats).
 */

export type LinkedTransaction = {
  caseId: string;
  valueFils: number;
  /** When the transaction occurred (ISO 8601). */
  occurredAt: string;
};

export type ThresholdPolicy = {
  thresholdFils: number;
  windowDays: number;
  /** True only when the value is the advisor-confirmed figure (not the placeholder). */
  confirmed: boolean;
  /** Provenance of the values, for audit/explanation. */
  source: string;
};

export type ReportabilityInput = {
  /** The transaction under assessment. */
  current: LinkedTransaction;
  /** Other transactions for the SAME customer (the engine applies the window). */
  priorLinked: LinkedTransaction[];
  policy: ThresholdPolicy;
};

export type ReportabilityResult = {
  reportable: boolean;
  aggregateFils: number;
  thresholdFils: number;
  windowDays: number;
  /** Case ids counted toward the aggregate (current + in-window priors). */
  linkedCaseIds: string[];
  reasons: string[];
  /** True when the policy is not advisor-confirmed — determination is indicative only. */
  provisional: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Validate an input transaction. A regulated determination must never be made
 * on malformed data: a NaN date or non-integer fils would silently skew the
 * window or the sum, so we fail loudly instead.
 */
function assertValidTx(t: LinkedTransaction): void {
  if (!Number.isInteger(t.valueFils) || t.valueFils < 0) {
    throw new Error(`threshold: invalid valueFils for case ${t.caseId}`);
  }
  if (!Number.isFinite(Date.parse(t.occurredAt))) {
    throw new Error(`threshold: invalid occurredAt for case ${t.caseId}`);
  }
}

function aed(fils: number): string {
  return new Intl.NumberFormat("en-AE", {
    maximumFractionDigits: fils % 100 === 0 ? 0 : 2,
  }).format(fils / 100);
}

/**
 * Determine whether `current` is reportable, aggregating same-customer
 * transactions within the policy window (anchored on the current transaction).
 */
export function assessReportability(input: ReportabilityInput): ReportabilityResult {
  const { current, priorLinked, policy } = input;
  assertValidTx(current);
  priorLinked.forEach(assertValidTx);

  const anchorMs = Date.parse(current.occurredAt);
  const windowStartMs = anchorMs - policy.windowDays * DAY_MS;

  // Priors within [anchor - window, anchor]. The current transaction is always counted.
  const inWindow = priorLinked.filter((t) => {
    const ms = Date.parse(t.occurredAt);
    return ms >= windowStartMs && ms <= anchorMs;
  });

  const counted = [current, ...inWindow];
  const aggregateFils = counted.reduce((sum, t) => sum + t.valueFils, 0);
  if (!Number.isSafeInteger(aggregateFils)) {
    // Beyond ~AED 90tn; impossible for real cases, but never silently lose precision.
    throw new Error("threshold: aggregate exceeds safe integer precision");
  }
  const reportable = aggregateFils >= policy.thresholdFils;

  const reasons: string[] = [];
  if (current.valueFils >= policy.thresholdFils) {
    reasons.push(
      `Single transaction of AED ${aed(current.valueFils)} is at or above the AED ${aed(policy.thresholdFils)} threshold.`,
    );
  } else if (reportable) {
    reasons.push(
      `Aggregate of AED ${aed(aggregateFils)} across ${counted.length} linked transactions within ${policy.windowDays} days is at or above the AED ${aed(policy.thresholdFils)} threshold.`,
    );
  } else {
    reasons.push(
      `Aggregate of AED ${aed(aggregateFils)} is below the AED ${aed(policy.thresholdFils)} threshold.`,
    );
  }
  if (inWindow.length > 0) {
    reasons.push(
      `Includes ${inWindow.length} prior linked transaction(s) within ${policy.windowDays} days.`,
    );
  }
  if (!policy.confirmed) {
    reasons.push(
      "Threshold is provisional and pending compliance-advisor confirmation (docs/goaml-mapping.md §2).",
    );
  }

  return {
    reportable,
    aggregateFils,
    thresholdFils: policy.thresholdFils,
    windowDays: policy.windowDays,
    linkedCaseIds: counted.map((t) => t.caseId),
    reasons,
    provisional: !policy.confirmed,
  };
}
