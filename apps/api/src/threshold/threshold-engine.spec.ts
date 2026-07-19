import {
  assessReportability,
  type LinkedTransaction,
  type ThresholdPolicy,
} from "./threshold-engine";

// AED 55,000 = 5,500,000 fils; 30-day window. CONFIRMED policy for most tests.
const CONFIRMED: ThresholdPolicy = {
  thresholdFils: 5_500_000,
  windowDays: 30,
  confirmed: true,
  source: "test",
};

const tx = (caseId: string, valueFils: number, occurredAt: string): LinkedTransaction => ({
  caseId,
  valueFils,
  occurredAt,
});

const ANCHOR = "2026-06-22T10:00:00.000Z";

describe("assessReportability", () => {
  it("flags a single transaction at/above the threshold", () => {
    const r = assessReportability({
      current: tx("c1", 6_140_000, ANCHOR),
      priorLinked: [],
      policy: CONFIRMED,
    });
    expect(r.reportable).toBe(true);
    expect(r.aggregateFils).toBe(6_140_000);
    expect(r.linkedCaseIds).toEqual(["c1"]);
    expect(r.reasons[0]).toMatch(/Single transaction/);
  });

  it("treats exactly-at-threshold as reportable (>=)", () => {
    const r = assessReportability({
      current: tx("c1", 5_500_000, ANCHOR),
      priorLinked: [],
      policy: CONFIRMED,
    });
    expect(r.reportable).toBe(true);
  });

  it("clears a single transaction below the threshold", () => {
    const r = assessReportability({
      current: tx("c1", 2_000_000, ANCHOR),
      priorLinked: [],
      policy: CONFIRMED,
    });
    expect(r.reportable).toBe(false);
    expect(r.aggregateFils).toBe(2_000_000);
    expect(r.reasons[0]).toMatch(/below/);
  });

  it("aggregates linked transactions within the window to cross the threshold", () => {
    const r = assessReportability({
      current: tx("c2", 3_000_000, ANCHOR),
      priorLinked: [tx("c1", 3_000_000, "2026-06-04T10:00:00.000Z")], // 18 days prior
      policy: CONFIRMED,
    });
    expect(r.reportable).toBe(true);
    expect(r.aggregateFils).toBe(6_000_000);
    expect(r.linkedCaseIds).toEqual(["c2", "c1"]);
    expect(r.reasons.join(" ")).toMatch(/Aggregate.*linked transactions/);
  });

  it("excludes a prior transaction outside the window", () => {
    const r = assessReportability({
      current: tx("c2", 3_000_000, ANCHOR),
      priorLinked: [tx("c1", 3_000_000, "2026-05-01T10:00:00.000Z")], // >30 days prior
      policy: CONFIRMED,
    });
    expect(r.reportable).toBe(false);
    expect(r.aggregateFils).toBe(3_000_000);
    expect(r.linkedCaseIds).toEqual(["c2"]);
  });

  it("includes a prior transaction exactly at the window boundary", () => {
    const r = assessReportability({
      current: tx("c2", 3_000_000, ANCHOR),
      priorLinked: [tx("c1", 3_000_000, "2026-05-23T10:00:00.000Z")], // exactly 30 days
      policy: CONFIRMED,
    });
    expect(r.aggregateFils).toBe(6_000_000);
    expect(r.reportable).toBe(true);
  });

  it("marks the result provisional when the policy is not advisor-confirmed", () => {
    const provisional: ThresholdPolicy = { ...CONFIRMED, confirmed: false, source: "PROVISIONAL" };
    const r = assessReportability({
      current: tx("c1", 6_140_000, ANCHOR),
      priorLinked: [],
      policy: provisional,
    });
    expect(r.provisional).toBe(true);
    expect(r.reasons.join(" ")).toMatch(/provisional and pending compliance-advisor/);
  });

  it("is not provisional under a confirmed policy", () => {
    const r = assessReportability({
      current: tx("c1", 6_140_000, ANCHOR),
      priorLinked: [],
      policy: CONFIRMED,
    });
    expect(r.provisional).toBe(false);
  });

  it("clears when there are no priors and the current is below threshold", () => {
    const r = assessReportability({
      current: tx("c1", 1_000_000, ANCHOR),
      priorLinked: [],
      policy: CONFIRMED,
    });
    expect(r.reportable).toBe(false);
    expect(r.linkedCaseIds).toEqual(["c1"]);
  });

  it("excludes a future-dated prior (after the anchor)", () => {
    const r = assessReportability({
      current: tx("c2", 3_000_000, ANCHOR),
      priorLinked: [tx("c3", 3_000_000, "2026-07-01T10:00:00.000Z")], // after anchor
      policy: CONFIRMED,
    });
    expect(r.aggregateFils).toBe(3_000_000);
    expect(r.reportable).toBe(false);
  });

  it("rejects malformed input rather than mis-determining", () => {
    expect(() =>
      assessReportability({
        current: tx("c1", 3_000_000, "not-a-date"),
        priorLinked: [],
        policy: CONFIRMED,
      }),
    ).toThrow(/invalid occurredAt/);
    expect(() =>
      assessReportability({
        current: { caseId: "c1", valueFils: 1.5, occurredAt: ANCHOR },
        priorLinked: [],
        policy: CONFIRMED,
      }),
    ).toThrow(/invalid valueFils/);
  });

  it("handles a large but safe aggregate without precision loss", () => {
    const big = 4_000_000_000_000; // AED 40bn in fils, within safe-integer range
    const r = assessReportability({
      current: tx("c1", big, ANCHOR),
      priorLinked: [tx("c0", big, "2026-06-10T10:00:00.000Z")],
      policy: CONFIRMED,
    });
    expect(r.aggregateFils).toBe(8_000_000_000_000);
    expect(r.reportable).toBe(true);
  });

  it("sums fils exactly (integer money, no float drift)", () => {
    const r = assessReportability({
      current: tx("c3", 1_999_999, ANCHOR),
      priorLinked: [
        tx("c2", 1_000_001, "2026-06-10T10:00:00.000Z"),
        tx("c1", 2_500_000, "2026-06-01T10:00:00.000Z"),
      ],
      policy: CONFIRMED,
    });
    expect(r.aggregateFils).toBe(5_500_000);
    expect(r.reportable).toBe(true);
  });
});
