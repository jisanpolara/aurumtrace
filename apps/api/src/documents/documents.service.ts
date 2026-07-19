import { randomUUID } from "node:crypto";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { z } from "zod";
import { DocumentKind, type Principal } from "@aurumtrace/shared";
import { TENANT_DATABASE, type TenantDatabase } from "../common/db/tenant-database";
import { AuditService } from "../audit/audit.service";
import { DOCUMENT_STORE, type DocumentStore } from "./document-store";
import { sha256Hex } from "./crypto-box";

export const UploadDocumentRequest = z.object({
  kind: DocumentKind,
  filename: z.string().min(1),
  contentBase64: z.string().min(1),
});
export type UploadDocumentRequest = z.infer<typeof UploadDocumentRequest>;

export type UploadedDocument = {
  id: string;
  kind: string;
  filename: string;
  contentHash: string;
  sizeBytes: number;
};

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(TENANT_DATABASE) private readonly db: TenantDatabase,
    @Inject(DOCUMENT_STORE) private readonly store: DocumentStore,
    private readonly audit: AuditService,
  ) {}

  async upload(
    principal: Principal,
    caseId: string,
    req: UploadDocumentRequest,
  ): Promise<UploadedDocument> {
    const bytes = Buffer.from(req.contentBase64, "base64");
    const contentHash = sha256Hex(bytes);
    const storagePath = `${principal.tenantId}/${caseId}/${randomUUID()}`;

    // Validate the case belongs to this tenant BEFORE writing ciphertext, so a
    // bad/cross-tenant caseId doesn't leave an orphaned encrypted blob on disk.
    await this.db.withTenant(principal, async (q) => {
      const found = await q.query<{ id: string }>(
        `select id from public.cases where id = $1`,
        [caseId],
      );
      if (!found.rows[0]) throw new NotFoundException("case not found");
    });

    // Encrypt-then-store BEFORE recording metadata; plaintext bytes never persist.
    await this.store.put(storagePath, bytes);

    return this.db.withTenant(principal, async (q) => {
      const row = await q.query<{ id: string }>(
        `insert into public.documents
           (tenant_id, case_id, kind, filename, storage_path, content_hash, uploaded_by)
         values ($1,$2,$3,$4,$5,$6,$7)
         returning id`,
        [
          principal.tenantId,
          caseId,
          req.kind,
          req.filename,
          storagePath,
          contentHash,
          principal.userId,
        ],
      );
      // Audit: kind + hash + size only — no filename (may embed a name) or bytes.
      await this.audit.appendWithin(q, principal, {
        tenantId: principal.tenantId,
        actorId: principal.userId,
        event: "document.uploaded",
        caseId,
        resourceType: "document",
        resourceId: row.rows[0]!.id,
        payload: { kind: req.kind, contentHash, sizeBytes: bytes.length },
      });
      return {
        id: row.rows[0]!.id,
        kind: req.kind,
        filename: req.filename,
        contentHash,
        sizeBytes: bytes.length,
      };
    });
  }
}
