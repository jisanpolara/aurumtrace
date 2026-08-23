import { Controller, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../common/auth/auth.guard";
import { RolesGuard } from "../common/auth/roles.guard";
import { Roles } from "../common/auth/roles.decorator";
import { CurrentPrincipal, type Principal } from "../common/principal";
import { ThresholdService } from "./threshold.service";
import type { ReportabilityResult } from "./threshold-engine";

@Controller("cases")
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "compliance_officer", "staff")
export class ThresholdController {
  constructor(private readonly threshold: ThresholdService) {}

  /** Run the reporting-threshold determination for a case (human-triggered). */
  @Post(":id/threshold")
  check(
    @CurrentPrincipal() principal: Principal,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ReportabilityResult> {
    return this.threshold.check(principal, id);
  }
}
