import Anthropic from "@anthropic-ai/sdk";
import { ProviderError } from "../common/resilience";
import { assertPiiAllowed } from "./pii-guard";
import { LlmRequest, type LlmAdapter, type LlmRequestInput, type LlmResponse } from "./types";

/**
 * Default model. Per Anthropic guidance we default to the most capable model;
 * a dealer/operator can pick a cheaper one (e.g. claude-haiku-4-5) via
 * ANTHROPIC_MODEL when they judge the cost/quality trade-off — that is their
 * decision, not a silent downgrade.
 */
const DEFAULT_MODEL = "claude-opus-5";

export type AnthropicLlmConfig = {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  timeoutMs?: number;
  maxRetries?: number;
  /** Injectable for tests; defaults to a real Anthropic client. */
  client?: Anthropic;
};

/**
 * Real LLM adapter (Anthropic Claude) for goAML narrative generation. Enforces
 * the PII guard before every call — prompts are built PII-free upstream, and
 * this is the last line of defence against incidental leakage. The SDK handles
 * auth (ANTHROPIC_API_KEY), timeouts and retries.
 */
export class AnthropicLlmAdapter implements LlmAdapter {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly defaultMaxTokens: number;

  constructor(config: AnthropicLlmConfig = {}) {
    this.client =
      config.client ??
      new Anthropic({
        apiKey: config.apiKey ?? process.env.ANTHROPIC_API_KEY,
        timeout: config.timeoutMs ?? 30_000,
        maxRetries: config.maxRetries ?? 2,
      });
    this.model = config.model ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
    this.defaultMaxTokens = config.maxTokens ?? 4096;
  }

  async complete(req: LlmRequestInput): Promise<LlmResponse> {
    const r = LlmRequest.parse(req);
    // Guardrail (CLAUDE.md): never send raw PII to a provider unless authorised.
    assertPiiAllowed(r.dataHandling, r.system ?? "", r.prompt);

    let message: Anthropic.Message;
    try {
      message = await this.client.messages.create({
        model: this.model,
        max_tokens: r.maxTokens ?? this.defaultMaxTokens,
        ...(r.system ? { system: r.system } : {}),
        messages: [{ role: "user", content: r.prompt }],
      });
    } catch (err) {
      throw new ProviderError("anthropic", "request failed", err);
    }

    if ((message.stop_reason as string) === "refusal") {
      throw new ProviderError("anthropic", "request declined by safety policy");
    }

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (!text) throw new ProviderError("anthropic", "empty completion");

    return { text, model: message.model };
  }
}
