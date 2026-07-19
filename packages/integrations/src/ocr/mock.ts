import { type ExtractedIdDocument, type OcrAdapter } from "./types";

/** Deterministic OCR for dev/tests (fictional identity, mirrors docs/design). */
export class MockOcrAdapter implements OcrAdapter {
  async extractIdDocument(_input: { imageRef: string }): Promise<ExtractedIdDocument> {
    return {
      documentType: "emirates_id",
      fullName: "Rashid Al Maktoum",
      idNumber: "784-1987-3456712-9",
      nationality: "UAE",
      dateOfBirth: "1987-03-14",
      idExpiry: "2028-08-09",
      confidence: 0.97,
    };
  }
}
