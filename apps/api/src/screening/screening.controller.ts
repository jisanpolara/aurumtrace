import { Controller, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../common/auth/auth.guard";
import { CurrentPrincipal, type Principal } from "../common/principal";
import { ScreeningService, type ScreeningRunResult } from "./screening.service";

@Controller("cases")
@UseGuards(AuthGuard)
export class ScreeningController {
  constructor(private readonly screening: ScreeningService) {}

  /** Run KYC/CDD screening + risk scoring for a case (human-triggered). */
  @Post(":id/screening")
  run(
    @CurrentPrincipal() principal: Principal,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ScreeningRunResult> {
    return this.screening.run(principal, id);
  }
}
