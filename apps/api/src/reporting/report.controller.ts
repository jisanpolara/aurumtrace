import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../common/auth/auth.guard";
import { RolesGuard } from "../common/auth/roles.guard";
import { Roles } from "../common/auth/roles.decorator";
import { CurrentPrincipal, type Principal } from "../common/principal";
import { ReportService, type ReportDraft, type ReportListRow } from "./report.service";

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class ReportController {
  constructor(private readonly reports: ReportService) {}

  /** All reports for the tenant (the Reports view). Open to any role (auditors read). */
  @Get("reports")
  list(@CurrentPrincipal() principal: Principal): Promise<ReportListRow[]> {
    return this.reports.list(principal);
  }

  /** Draft (or re-draft) a goAML report for a case. Never files. */
  @Roles("owner", "compliance_officer")
  @Post("cases/:id/report")
  draft(
    @CurrentPrincipal() principal: Principal,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ReportDraft> {
    return this.reports.draft(principal, id);
  }

  /** Explicit human "file" action — the only path that marks a report filed. */
  @Roles("owner", "compliance_officer")
  @Post("reports/:id/file")
  file(
    @CurrentPrincipal() principal: Principal,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<{ id: string; status: string; filedAt: string }> {
    return this.reports.file(principal, id);
  }
}
