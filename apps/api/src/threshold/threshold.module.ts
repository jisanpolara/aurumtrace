import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { ThresholdService } from "./threshold.service";
import { ThresholdController } from "./threshold.controller";

@Module({
  imports: [AuditModule],
  providers: [ThresholdService],
  controllers: [ThresholdController],
})
export class ThresholdModule {}
