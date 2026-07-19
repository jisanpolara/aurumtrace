import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../common/auth/auth.guard";
import { CurrentPrincipal, type Principal } from "../common/principal";
import { CasesService, type DashboardSummary } from "./cases.service";

@Controller("dashboard")
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly cases: CasesService) {}

  @Get("summary")
  summary(@CurrentPrincipal() principal: Principal): Promise<DashboardSummary> {
    return this.cases.summary(principal);
  }
}
