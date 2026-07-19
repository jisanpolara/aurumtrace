import { Module } from "@nestjs/common";
import { CasesService } from "./cases.service";
import { CasesController } from "./cases.controller";
import { DashboardController } from "./dashboard.controller";

@Module({
  providers: [CasesService],
  controllers: [CasesController, DashboardController],
})
export class CasesModule {}
