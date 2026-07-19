import { assessSourcingRisk, type OecdSteps } from "./sourcing-risk";

const steps = (n: number): OecdSteps => {
  const keys: (keyof OecdSteps)[] = [
    "managementSystems",
    "riskAssessment",
    "riskStrategy",
    "audit",
    "reporting",
  ];
  return keys.reduce((acc, k, i) => ({ ...acc, [k]: i < n }), {} as OecdSteps);
};

describe("assessSourcingRisk", () => {
  it("rates an unknown declaration High regardless of steps", () => {
    expect(assessSourcingRisk({ declarationType: "unknown", steps: steps(5) }).risk).toBe("high");
  });

  it("rates customer-owned with all 5 OECD steps as Low", () => {
    const r = assessSourcingRisk({ declarationType: "customer_owned", steps: steps(5) });
    expect(r.risk).toBe("low");
    expect(r.completedSteps).toBe(5);
    expect(r.provisional).toBe(true); // pilot rules, pending MLRO confirmation
  });

  it("rates customer-owned with 3-4 steps as Medium", () => {
    expect(assessSourcingRisk({ declarationType: "customer_owned", steps: steps(3) }).risk).toBe(
      "medium",
    );
    expect(assessSourcingRisk({ declarationType: "customer_owned", steps: steps(4) }).risk).toBe(
      "medium",
    );
  });

  it("rates customer-owned with fewer than 3 steps as High", () => {
    expect(assessSourcingRisk({ declarationType: "customer_owned", steps: steps(2) }).risk).toBe(
      "high",
    );
  });

  it("rates dealer-sourced as Medium only with all 5 steps, else High", () => {
    expect(assessSourcingRisk({ declarationType: "dealer_sourced", steps: steps(5) }).risk).toBe(
      "medium",
    );
    expect(assessSourcingRisk({ declarationType: "dealer_sourced", steps: steps(4) }).risk).toBe(
      "high",
    );
  });

  it("lists the outstanding OECD steps", () => {
    const r = assessSourcingRisk({ declarationType: "customer_owned", steps: steps(3) });
    expect(r.reasons.join(" ")).toMatch(/Outstanding OECD steps: audit, reporting/);
  });
});
