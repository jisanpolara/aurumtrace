import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../common/auth/auth.guard";
import { CurrentPrincipal, type Principal } from "../common/principal";
import { CustomersService, type CustomerListRow } from "./customers.service";

@Controller("customers")
@UseGuards(AuthGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(@CurrentPrincipal() principal: Principal): Promise<CustomerListRow[]> {
    return this.customers.list(principal);
  }
}
