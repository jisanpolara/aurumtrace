import { z } from "zod";
import { ItemType, TransactionType } from "@aurumtrace/shared";

/** Body for creating a case at the counter: a scanned ID + the gold item. */
export const CreateCaseRequest = z.object({
  /** Storage reference to the uploaded ID scan (OCR reads this). */
  idImageRef: z.string().min(1),
  /** When the transaction occurred (ISO 8601). Defaults to now if omitted. */
  occurredAt: z.string().datetime().optional(),
  item: z.object({
    itemType: ItemType,
    purityKarat: z.number().int().min(1).max(24),
    weightGrams: z.number().positive(),
    transactionType: TransactionType,
  }),
});
export type CreateCaseRequest = z.infer<typeof CreateCaseRequest>;
