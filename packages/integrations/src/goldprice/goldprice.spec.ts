import { ProviderError } from "../common/resilience";
import { HttpGoldPriceAdapter } from "./http";
import { MockGoldPriceAdapter } from "./mock";

function okResponse(data: unknown): Response {
  return { ok: true, status: 200, json: async () => data } as unknown as Response;
}

describe("MockGoldPriceAdapter", () => {
  it("returns 24,560 fils/g at 24K and scales by karat", async () => {
    const a = new MockGoldPriceAdapter();
    expect((await a.getPricePerGram()).filsPerGram).toBe(24_560);
    // 24560 * 22 / 24 = 22513.33 -> 22513
    expect((await a.getPricePerGram({ purityKarat: 22 })).filsPerGram).toBe(22_513);
  });
});

describe("HttpGoldPriceAdapter", () => {
  it("fetches, validates and converts AED/g to fils", async () => {
    const fetchImpl = jest.fn(async () =>
      okResponse({ price_aed_per_gram_24k: 245.6, as_of: "2026-06-22T10:00:00.000Z" }),
    );
    const a = new HttpGoldPriceAdapter({ endpoint: "https://x", fetchImpl });
    const price = await a.getPricePerGram();
    expect(price.filsPerGram).toBe(24_560);
    expect(price.currency).toBe("AED");
    expect(price.source).toBe("http");
    expect(price.asOf).toBe("2026-06-22T10:00:00.000Z");
  });

  it("retries a transient failure then succeeds", async () => {
    let calls = 0;
    const fetchImpl = jest.fn(async () => {
      calls++;
      if (calls < 2) throw new Error("ECONNRESET");
      return okResponse({ price_aed_per_gram_24k: 245.6 });
    });
    const a = new HttpGoldPriceAdapter({
      endpoint: "https://x",
      fetchImpl,
      resilience: { retries: 2, baseDelayMs: 1 },
    });
    expect((await a.getPricePerGram()).filsPerGram).toBe(24_560);
    expect(calls).toBe(2);
  });

  it("raises ProviderError on a non-OK status", async () => {
    const fetchImpl = jest.fn(
      async () => ({ ok: false, status: 503, json: async () => ({}) }) as unknown as Response,
    );
    const a = new HttpGoldPriceAdapter({
      endpoint: "https://x",
      fetchImpl,
      resilience: { retries: 0 },
    });
    await expect(a.getPricePerGram()).rejects.toBeInstanceOf(ProviderError);
  });

  it("raises ProviderError on an unexpected response shape", async () => {
    const fetchImpl = jest.fn(async () => okResponse({ wrong: true }));
    const a = new HttpGoldPriceAdapter({
      endpoint: "https://x",
      fetchImpl,
      resilience: { retries: 0 },
    });
    await expect(a.getPricePerGram()).rejects.toBeInstanceOf(ProviderError);
  });
});
