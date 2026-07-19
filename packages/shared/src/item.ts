import { z } from "zod";
import { TenantId, Uuid } from "./ids";
import { Fils } from "./money";

export const ItemType = z.enum(["bar", "coins", "jewellery", "scrap", "other"]);
export type ItemType = z.infer<typeof ItemType>;

export const TransactionType = z.enum(["buy_from_customer", "sell_to_customer"]);
export type TransactionType = z.infer<typeof TransactionType>;

/** A gold item being transacted in a case. Value computed in fils. */
export const Item = z.object({
  id: Uuid,
  tenantId: TenantId,
  caseId: Uuid,
  itemType: ItemType,
  purityKarat: z.number().int().min(1).max(24).nullable(),
  weightGrams: z.number().positive(),
  transactionType: TransactionType,
  goldPriceFilsPerGram: Fils.nullable(),
  valueFils: Fils.nullable(),
  createdAt: z.string().datetime(),
});
export type Item = z.infer<typeof Item>;
