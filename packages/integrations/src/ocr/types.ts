import { z } from "zod";

/** Fields extracted from an identity document. PII — handle under RLS, never log raw. */
export const ExtractedIdDocument = z.object({
  documentType: z.enum(["emirates_id", "passport"]),
  fullName: z.string().min(1),
  idNumber: z.string().min(1),
  nationality: z.string().nullable(),
  dateOfBirth: z.string().date().nullable(),
  idExpiry: z.string().date().nullable(),
  /** Extraction confidence 0..1, for human-review prompting. */
  confidence: z.number().min(0).max(1),
});
export type ExtractedIdDocument = z.infer<typeof ExtractedIdDocument>;

export interface OcrAdapter {
  /** `imageRef` is a storage reference (not raw bytes) to the uploaded scan. */
  extractIdDocument(input: { imageRef: string }): Promise<ExtractedIdDocument>;
}
