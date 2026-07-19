import {
  BadRequestException,
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../common/auth/auth.guard";
import { CurrentPrincipal, type Principal } from "../common/principal";
import {
  DocumentsService,
  UploadDocumentRequest,
  type UploadedDocument,
} from "./documents.service";

@Controller("cases")
@UseGuards(AuthGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post(":id/documents")
  async upload(
    @CurrentPrincipal() principal: Principal,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ): Promise<UploadedDocument> {
    const parsed = UploadDocumentRequest.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.documents.upload(principal, id, parsed.data);
  }
}
