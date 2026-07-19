import { assertPiiAllowed } from "./pii-guard";
import { type LlmAdapter, LlmRequest, type LlmRequestInput, type LlmResponse } from "./types";

/**
 * Deterministic LLM for dev/tests. Crucially it still enforces the PII guard, so
 * tests exercise the same default-deny path a real provider adapter must use.
 */
export class MockLlmAdapter implements LlmAdapter {
  async complete(req: LlmRequestInput): Promise<LlmResponse> {
    const r = LlmRequest.parse(req);
    assertPiiAllowed(r.dataHandling, r.system ?? "", r.prompt);
    return { text: `[mock-llm] ${r.prompt.slice(0, 64)}`, model: "mock" };
  }
}
