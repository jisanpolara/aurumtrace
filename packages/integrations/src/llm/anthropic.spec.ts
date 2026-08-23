import type Anthropic from "@anthropic-ai/sdk";
import { AnthropicLlmAdapter } from "./anthropic";
import { PiiNotAuthorisedError } from "./pii-guard";
import { ProviderError } from "../common/resilience";

/** Build a fake Anthropic client whose messages.create returns `msg`. */
function fakeClient(
  msg: { content: unknown; model: string; stop_reason?: string },
  spy?: (params: unknown) => void,
): Anthropic {
  return {
    messages: {
      create: async (params: unknown) => {
        spy?.(params);
        return msg;
      },
    },
  } as unknown as Anthropic;
}

describe("AnthropicLlmAdapter", () => {
  it("returns the text of the completion and the model", async () => {
    let seen: any;
    const client = fakeClient(
      { content: [{ type: "text", text: "  Structured Transaction 25 (STR) narrative.  " }], model: "claude-opus-5", stop_reason: "end_turn" },
      (p) => (seen = p),
    );
    const adapter = new AnthropicLlmAdapter({ client, model: "claude-opus-5" });

    const out = await adapter.complete({ system: "You draft goAML narratives.", prompt: "Case AT-1: reportable, above threshold." });
    expect(out).toEqual({ text: "Structured Transaction 25 (STR) narrative.", model: "claude-opus-5" });
    expect(seen.model).toBe("claude-opus-5");
    expect(seen.messages[0].role).toBe("user");
  });

  it("enforces the PII guard BEFORE calling the provider (default no_pii)", async () => {
    let called = false;
    const client = fakeClient({ content: [{ type: "text", text: "x" }], model: "m" }, () => (called = true));
    const adapter = new AnthropicLlmAdapter({ client });
    // Emirates ID in the prompt must be blocked before any provider call.
    await expect(
      adapter.complete({ prompt: "Customer 784-1987-3456712-9 flagged." }),
    ).rejects.toBeInstanceOf(PiiNotAuthorisedError);
    expect(called).toBe(false);
  });

  it("throws a ProviderError when the model refuses", async () => {
    const client = fakeClient({ content: [], model: "claude-opus-5", stop_reason: "refusal" });
    const adapter = new AnthropicLlmAdapter({ client });
    await expect(adapter.complete({ prompt: "benign narrative request" })).rejects.toBeInstanceOf(ProviderError);
  });

  it("throws a ProviderError on an empty completion", async () => {
    const client = fakeClient({ content: [{ type: "text", text: "   " }], model: "m", stop_reason: "end_turn" });
    const adapter = new AnthropicLlmAdapter({ client });
    await expect(adapter.complete({ prompt: "benign narrative request" })).rejects.toBeInstanceOf(ProviderError);
  });
});
