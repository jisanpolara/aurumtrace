import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import type { AuditEntry } from "@aurumtrace/shared";
import { AuthGuard } from "../common/auth/auth.guard";
import { CurrentPrincipal, type Principal } from "../common/principal";
import { AuditService } from "./audit.service";
import type { ChainVerification } from "./audit-hash";

/** Read-only audit endpoints. Entries are written by the system, never via HTTP. */
@Controller()
@UseGuards(AuthGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  /** Tenant-wide audit log (newest activity surfaced in the Audit view). */
  @Get("audit")
  list(@CurrentPrincipal() principal: Principal): Promise<AuditEntry[]> {
    return this.audit.list(principal);
  }

  /** Chain-integrity verification over the tenant's append-only log. */
  @Get("audit/verify")
  verify(@CurrentPrincipal() principal: Principal): Promise<ChainVerification> {
    return this.audit.verify(principal);
  }

  /** The audit timeline for a single case. */
  @Get("cases/:id/audit")
  listForCase(
    @CurrentPrincipal() principal: Principal,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<AuditEntry[]> {
    return this.audit.listForCase(principal, id);
  }
}
