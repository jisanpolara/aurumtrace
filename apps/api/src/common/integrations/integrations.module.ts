import { Global, Module } from "@nestjs/common";
import {
  AnthropicLlmAdapter,
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
 * Wires the provider adapters. Mocks by default; each swaps to its real impl
 * when configured: gold price (GOLD_PRICE_URL), screening (SCREENING_URL),
 * LLM (ANTHROPIC_API_KEY → Claude). OCR stays mocked pending a vendor choice.
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
    {
      provide: LLM,
      useFactory: () =>
        process.env.ANTHROPIC_API_KEY
          ? new AnthropicLlmAdapter()
          : new MockLlmAdapter(),
    },
  ],
  exports: [GOLD_PRICE, OCR, SCREENING, LLM],
})
export class IntegrationsModule {}
