import { z } from "zod";
import { Fils, fils } from "@aurumtrace/shared";

/** A gold price quote for a given purity, in fils per gram (no floats). */
export const GoldPrice = z.object({
  filsPerGram: Fils,
  currency: z.literal("AED"),
  purityKarat: z.number().int().min(1).max(24),
  asOf: z.string().datetime(),
  source: z.string().min(1),
});
export type GoldPrice = z.infer<typeof GoldPrice>;

/** Live (or mocked) spot-price source. Implementations live behind this interface. */
export interface GoldPriceAdapter {
  /** Price per gram for the given purity (default 24K / pure). */
  getPricePerGram(opts?: { purityKarat?: number }): Promise<GoldPrice>;
}

/** Scale a 24K (pure) per-gram price to a given karat, staying in integer fils. */
export function scaleByKarat(filsPerGram24k: Fils, karat: number): Fils {
  return fils(Math.round((filsPerGram24k * karat) / 24));
}
