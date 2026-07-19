import { z } from "zod";
import { ProviderError, type ResilienceOptions, withResilience } from "../common/resilience";
import {
  ScreeningOutcome,
  type ScreeningAdapter,
  type ScreeningSubject,
} from "./types";

/**
 * Expected provider response (normalised). Pilot target is OpenSanctions; the
 * adapter maps that to our shape. NOTE: screening legitimately sends the
 * customer's name/DOB to the provider — that is the authorised purpose of KYC
 * screening (distinct from the LLM PII guard, which blocks incidental leakage).
 */
const ScreeningApiResponse = z.object({
  sanctions_match: z.boolean(),
  pep_match: z.boolean(),
  adverse_media: z.boolean(),
  identity_verified: z.boolean(),
  hits: z
    .array(z.object({ list: z.string(), name: z.string(), score: z.number() }))
    .default([]),
});

export type HttpScreeningConfig = {
  endpoint: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  resilience?: ResilienceOptions;
};

export class HttpScreeningAdapter implements ScreeningAdapter {
  private readonly fetchImpl: typeof fetch;
  constructor(private readonly config: HttpScreeningConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async screen(subject: ScreeningSubject): Promise<ScreeningOutcome> {
    const data = await withResilience(async (signal) => {
      let res: Response;
      try {
        res = await this.fetchImpl(this.config.endpoint, {
          method: "POST",
          signal,
          headers: {
            "content-type": "application/json",
            ...(this.config.apiKey ? { authorization: `Bearer ${this.config.apiKey}` } : {}),
          },
          body: JSON.stringify(subject),
        });
      } catch (err) {
        if (signal.aborted) throw signal.reason;
        throw new ProviderError("screening", "request failed", err);
      }
      if (!res.ok) throw new ProviderError("screening", `HTTP ${res.status}`);
      const parsed = ScreeningApiResponse.safeParse(await res.json());
      if (!parsed.success) {
        throw new ProviderError("screening", "unexpected response shape", parsed.error);
      }
      return parsed.data;
    }, this.config.resilience);

    return ScreeningOutcome.parse({
      sanctionsMatch: data.sanctions_match,
      pepMatch: data.pep_match,
      adverseMedia: data.adverse_media,
      identityVerified: data.identity_verified,
      hits: data.hits.map((h) => ({ list: h.list, matchName: h.name, score: h.score })),
      checkedAt: new Date().toISOString(),
      source: "opensanctions",
    });
  }
}
