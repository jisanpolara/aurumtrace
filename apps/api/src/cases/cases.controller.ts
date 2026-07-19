import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../common/auth/auth.guard";
import { CurrentPrincipal, type Principal } from "../common/principal";
import { CasesService, type CaseListRow } from "./cases.service";

@Controller("cases")
@UseGuards(AuthGuard)
export class CasesController {
  constructor(private readonly cases: CasesService) {}

  @Get()
  list(
    @CurrentPrincipal() principal: Principal,
    @Query("limit") limit?: string,
  ): Promise<CaseListRow[]> {
    const n = Math.min(Math.max(Number(limit) || 10, 1), 50);
    return this.cases.listRecent(principal, n);
  }
}
