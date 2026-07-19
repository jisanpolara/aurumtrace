import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { ScreeningService } from "./screening.service";
import { ScreeningController } from "./screening.controller";

@Module({
  imports: [AuditModule],
  providers: [ScreeningService],
  controllers: [ScreeningController],
})
export class ScreeningModule {}
