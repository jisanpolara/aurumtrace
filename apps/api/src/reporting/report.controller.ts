import { Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../common/auth/auth.guard";
import { CurrentPrincipal, type Principal } from "../common/principal";
import { ReportService, type ReportDraft, type ReportListRow } from "./report.service";

@Controller()
@UseGuards(AuthGuard)
export class ReportController {
  constructor(private readonly reports: ReportService) {}

  /** All reports for the tenant (the Reports view). */
  @Get("reports")
  list(@CurrentPrincipal() principal: Principal): Promise<ReportListRow[]> {
    return this.reports.list(principal);
  }

  /** Draft (or re-draft) a goAML report for a case. Never files. */
  @Post("cases/:id/report")
  draft(
    @CurrentPrincipal() principal: Principal,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ReportDraft> {
    return this.reports.draft(principal, id);
  }

  /** Explicit human "file" action — the only path that marks a report filed. */
  @Post("reports/:id/file")
  file(
    @CurrentPrincipal() principal: Principal,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<{ id: string; status: string; filedAt: string }> {
    return this.reports.file(principal, id);
  }
}
