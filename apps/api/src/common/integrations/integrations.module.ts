import { Global, Module } from "@nestjs/common";
import {
  HttpGoldPriceAdapter,
  HttpScreeningAdapter,
  MockGoldPriceAdapter,
  MockLlmAdapter,
  MockOcrAdapter,
  MockScreeningAdapter,
} from "@aurumtrace/integrations";

export const GOLD_PRICE = Symbol("GOLD_PRICE");
export const OCR = Symbol("OCR");
export const SCREENING = Symbol("SCREENING");
export const LLM = Symbol("LLM");

/**
 * Wires the provider adapters. Mocks by default; the gold-price adapter uses
 * the real HTTP impl when GOLD_PRICE_URL is configured. OCR/screening/LLM stay
 * mocked until their own modules (Steps 4/6/8).
 */
@Global()
@Module({
  providers: [
    {
      provide: GOLD_PRICE,
      useFactory: () =>
        process.env.GOLD_PRICE_URL
          ? new HttpGoldPriceAdapter({ endpoint: process.env.GOLD_PRICE_URL })
          : new MockGoldPriceAdapter(),
    },
    { provide: OCR, useValue: new MockOcrAdapter() },
    {
      provide: SCREENING,
      useFactory: () =>
        process.env.SCREENING_URL
          ? new HttpScreeningAdapter({
              endpoint: process.env.SCREENING_URL,
              apiKey: process.env.SCREENING_API_KEY,
            })
          : new MockScreeningAdapter(),
    },
    { provide: LLM, useValue: new MockLlmAdapter() },
  ],
  exports: [GOLD_PRICE, OCR, SCREENING, LLM],
})
export class IntegrationsModule {}
