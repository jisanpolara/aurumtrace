import { z } from "zod";
import { TenantId, UserId, Uuid } from "./ids";

export const DocumentKind = z.enum([
  "id_scan",
  "source_declaration",
  "supporting",
  "other",
]);
export type DocumentKind = z.infer<typeof DocumentKind>;

/** Metadata for an uploaded document. Bytes are stored encrypted in object storage. */
export const DocumentMeta = z.object({
  id: Uuid,
  tenantId: TenantId,
  caseId: Uuid.nullable(),
  kind: DocumentKind,
  filename: z.string().min(1),
  storagePath: z.string().min(1),
  contentHash: z.string().length(64).nullable(),
  uploadedBy: UserId.nullable(),
  uploadedAt: z.string().datetime(),
});
export type DocumentMeta = z.infer<typeof DocumentMeta>;
