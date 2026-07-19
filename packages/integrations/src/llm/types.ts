import { z } from "zod";
import { type DataHandling } from "./pii-guard";

export const LlmRequest = z.object({
  system: z.string().optional(),
  prompt: z.string().min(1),
  /**
   * Whether this request is permitted to contain PII. `no_pii` (default) is
   * enforced by the adapter via the PII guard before any provider call.
   */
  dataHandling: z.enum(["no_pii", "pii_authorised"]).default("no_pii"),
  maxTokens: z.number().int().positive().optional(),
});
export type LlmRequest = z.infer<typeof LlmRequest>;

export const LlmResponse = z.object({
  text: z.string(),
  model: z.string(),
});
export type LlmResponse = z.infer<typeof LlmResponse>;

/** Caller-facing input type — `dataHandling` is optional (defaults to no_pii). */
export type LlmRequestInput = z.input<typeof LlmRequest>;

export interface LlmAdapter {
  complete(req: LlmRequestInput): Promise<LlmResponse>;
}

export type { DataHandling };
