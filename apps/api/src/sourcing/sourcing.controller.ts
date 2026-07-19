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
import { SourcingService, SourcingRequest } from "./sourcing.service";
import type { SourcingResult } from "./sourcing-risk";

@Controller("cases")
@UseGuards(AuthGuard)
export class SourcingController {
  constructor(private readonly sourcing: SourcingService) {}

  @Post(":id/sourcing")
  async submit(
    @CurrentPrincipal() principal: Principal,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: unknown,
  ): Promise<SourcingResult> {
    const parsed = SourcingRequest.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.sourcing.submit(principal, id, parsed.data);
  }
}
