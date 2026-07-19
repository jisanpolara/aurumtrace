import { z } from "zod";
import { aedToFils } from "@aurumtrace/shared";
import { ProviderError, type ResilienceOptions, withResilience } from "../common/resilience";
import { GoldPrice, type GoldPriceAdapter, scaleByKarat } from "./types";

/**
 * Expected provider response. The exact upstream is chosen in the provider
 * bake-off; adapters normalise to this shape. Quote is the 24K (pure) AED/gram.
 */
const GoldApiResponse = z.object({
  price_aed_per_gram_24k: z.number().positive(),
  as_of: z.string().datetime().optional(),
});

export type HttpGoldPriceConfig = {
  endpoint: string;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  resilience?: ResilienceOptions;
};

/**
 * Real gold-price adapter: fetches a quote over HTTP with per-attempt timeout +
 * retry, validates the response, and returns integer fils/gram. No PII involved
 * (lowest-risk provider — implemented first per the build plan).
 */
export class HttpGoldPriceAdapter implements GoldPriceAdapter {
  private readonly fetchImpl: typeof fetch;
  constructor(private readonly config: HttpGoldPriceConfig) {
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async getPricePerGram(opts?: { purityKarat?: number }): Promise<GoldPrice> {
    const karat = opts?.purityKarat ?? 24;

    const data = await withResilience(async (signal) => {
      let res: Response;
      try {
        res = await this.fetchImpl(this.config.endpoint, { signal });
      } catch (err) {
        if (signal.aborted) throw signal.reason; // let resilience classify timeout
        throw new ProviderError("goldprice", "request failed", err);
      }
      if (!res.ok) throw new ProviderError("goldprice", `HTTP ${res.status}`);
      const json: unknown = await res.json();
      const parsed = GoldApiResponse.safeParse(json);
      if (!parsed.success) {
        throw new ProviderError("goldprice", "unexpected response shape", parsed.error);
      }
      return parsed.data;
    }, this.config.resilience);

    const spot24k = aedToFils(data.price_aed_per_gram_24k);
    return GoldPrice.parse({
      filsPerGram: scaleByKarat(spot24k, karat),
      currency: "AED",
      purityKarat: karat,
      asOf: data.as_of ?? new Date().toISOString(),
      source: "http",
    });
  }
}
