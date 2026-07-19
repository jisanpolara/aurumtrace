import { tmpdir } from "node:os";
import { join } from "node:path";
import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DocumentsService } from "./documents.service";
import { DocumentsController } from "./documents.controller";
import { DOCUMENT_STORE, LocalEncryptedStore } from "./document-store";
import { loadDocumentKey } from "./crypto-box";

@Module({
  imports: [AuditModule],
  providers: [
    DocumentsService,
    {
      provide: DOCUMENT_STORE,
      // Key is resolved lazily on first upload, so apps that never upload (and
      // tests) don't require DOCUMENTS_ENC_KEY at boot.
      useFactory: () =>
        new LocalEncryptedStore(
          process.env.DOCUMENTS_DIR ?? join(tmpdir(), "aurumtrace-docs"),
          () => loadDocumentKey(),
        ),
    },
  ],
  controllers: [DocumentsController],
})
export class DocumentsModule {}
