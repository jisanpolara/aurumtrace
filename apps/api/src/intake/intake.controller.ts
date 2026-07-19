import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../common/auth/auth.guard";
import { CurrentPrincipal, type Principal } from "../common/principal";
import { IntakeService, type IntakeResult } from "./intake.service";
import { CreateCaseRequest } from "./dto";

@Controller("intake")
@UseGuards(AuthGuard)
export class IntakeController {
  constructor(private readonly intake: IntakeService) {}

  @Post("cases")
  async create(
    @CurrentPrincipal() principal: Principal,
    @Body() body: unknown,
  ): Promise<IntakeResult> {
    const parsed = CreateCaseRequest.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.intake.createCase(principal, parsed.data);
  }
}
