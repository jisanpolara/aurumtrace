import { Fils, fils } from "@aurumtrace/shared";
import { type GoldPrice, type GoldPriceAdapter, scaleByKarat } from "./types";

/** Deterministic gold price for dev/tests. Default 24K = AED 245.60/g (24,560 fils). */
export class MockGoldPriceAdapter implements GoldPriceAdapter {
  constructor(private readonly spot24kFilsPerGram: Fils = fils(24_560)) {}

  async getPricePerGram(opts?: { purityKarat?: number }): Promise<GoldPrice> {
    const karat = opts?.purityKarat ?? 24;
    return {
      filsPerGram: scaleByKarat(this.spot24kFilsPerGram, karat),
      currency: "AED",
      purityKarat: karat,
      asOf: new Date().toISOString(),
      source: "mock",
    };
  }
}
