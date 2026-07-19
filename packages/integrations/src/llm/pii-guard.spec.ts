import { MockLlmAdapter } from "./mock";
import { assertPiiAllowed, PiiNotAuthorisedError, scanForPii } from "./pii-guard";

describe("PII guard", () => {
  it("detects Emirates ID, email and phone", () => {
    expect(scanForPii("id 784-1987-3456712-9")).toContain("emirates_id");
    expect(scanForPii("write to a.b@example.ae")).toContain("email");
    expect(scanForPii("call 0551234567")).toContain("uae_phone");
    expect(scanForPii("just a normal sentence")).toEqual([]);
  });

  it("blocks PII when not authorised, allows clean text", () => {
    expect(() => assertPiiAllowed("no_pii", "summarise this case")).not.toThrow();
    expect(() => assertPiiAllowed("no_pii", "customer 784-1987-3456712-9")).toThrow(
      PiiNotAuthorisedError,
    );
  });

  it("allows PII when explicitly authorised", () => {
    expect(() => assertPiiAllowed("pii_authorised", "784-1987-3456712-9")).not.toThrow();
  });
});

describe("MockLlmAdapter enforces the guard", () => {
  it("rejects a no_pii prompt containing PII", async () => {
    const llm = new MockLlmAdapter();
    await expect(
      llm.complete({ prompt: "draft narrative for 784-1987-3456712-9" }),
    ).rejects.toBeInstanceOf(PiiNotAuthorisedError);
  });

  it("completes a clean prompt", async () => {
    const llm = new MockLlmAdapter();
    const r = await llm.complete({ prompt: "draft a neutral compliance summary" });
    expect(r.text).toMatch(/mock-llm/);
  });

  it("completes when PII is authorised", async () => {
    const llm = new MockLlmAdapter();
    const r = await llm.complete({
      prompt: "include 784-1987-3456712-9",
      dataHandling: "pii_authorised",
    });
    expect(r.model).toBe("mock");
  });
});
