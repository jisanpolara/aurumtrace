import { bandFor, scoreRisk, type RiskFacts } from "./risk-engine";

const clean: RiskFacts = {
  screening: { sanctionsMatch: false, pepMatch: false, adverseMedia: false, identityVerified: true },
  reportable: false,
  linkedCount: 1,
  residency: "resident",
  customerTenureMonths: 0,
};

describe("scoreRisk", () => {
  it("scores a clean, verified, resident customer as Low (baseline only)", () => {
    const r = scoreRisk(clean);
    expect(r.score).toBe(30);
    expect(r.band).toBe("low");
    expect(r.forcedHigh).toBe(false);
    expect(r.provisional).toBe(true); // pilot weights, pending MLRO calibration
  });

  it("forces High on a sanctions match regardless of other factors", () => {
    const r = scoreRisk({ ...clean, screening: { ...clean.screening, sanctionsMatch: true } });
    expect(r.forcedHigh).toBe(true);
    expect(r.score).toBe(100);
    expect(r.band).toBe("high");
    expect(r.factors.map((f) => f.code)).toEqual(["sanctions_match"]);
  });

  it("matches the design example: reportable + prior linked + established = 55 / Medium", () => {
    const r = scoreRisk({
      ...clean,
      reportable: true,
      linkedCount: 2,
      customerTenureMonths: 40,
    });
    // 30 baseline + 25 reportable + 10 prior linked - 10 established = 55
    expect(r.score).toBe(55);
    expect(r.band).toBe("medium");
  });

  it("adds points for unverified identity", () => {
    const r = scoreRisk({ ...clean, screening: { ...clean.screening, identityVerified: false } });
    expect(r.score).toBe(55); // 30 + 25
    expect(r.band).toBe("medium");
  });

  it("escalates a PEP + reportable customer to High", () => {
    const r = scoreRisk({
      ...clean,
      screening: { ...clean.screening, pepMatch: true },
      reportable: true,
    });
    expect(r.score).toBe(85); // 30 + 30 + 25
    expect(r.band).toBe("high");
  });

  it("counts non-resident as a risk factor", () => {
    const r = scoreRisk({ ...clean, residency: "non_resident" });
    expect(r.factors.some((f) => f.code === "non_resident")).toBe(true);
    expect(r.score).toBe(40); // 30 + 10
  });

  it("clamps the score to 0..100", () => {
    const r = scoreRisk({
      screening: { sanctionsMatch: false, pepMatch: true, adverseMedia: true, identityVerified: false },
      reportable: true,
      linkedCount: 3,
      residency: "non_resident",
      customerTenureMonths: null,
    });
    // 30+30+20+25+25+10+10 = 150 -> clamped 100
    expect(r.score).toBe(100);
    expect(r.band).toBe("high");
  });

  it("does not apply the established-customer mitigant below the tenure threshold", () => {
    const r = scoreRisk({ ...clean, reportable: true, customerTenureMonths: 12 });
    expect(r.score).toBe(55); // 30 + 25, no -10
    expect(r.factors.some((f) => f.code === "established_customer")).toBe(false);
  });

  it("does not count a single transaction as prior-linked", () => {
    const r = scoreRisk({ ...clean, linkedCount: 1 });
    expect(r.factors.some((f) => f.code === "prior_linked")).toBe(false);
  });

  it("treats adverse media alone as a Medium-band factor", () => {
    const r = scoreRisk({ ...clean, screening: { ...clean.screening, adverseMedia: true } });
    expect(r.score).toBe(50); // 30 + 20
    expect(r.band).toBe("medium");
  });

  it("locks the band cut-offs at exactly 34 and 67", () => {
    expect(bandFor(33)).toBe("low");
    expect(bandFor(34)).toBe("medium");
    expect(bandFor(66)).toBe("medium");
    expect(bandFor(67)).toBe("high");
  });
});
