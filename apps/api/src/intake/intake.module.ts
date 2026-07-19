import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { IntakeService } from "./intake.service";
import { IntakeController } from "./intake.controller";

@Module({
  imports: [AuditModule],
  providers: [IntakeService],
  controllers: [IntakeController],
})
export class IntakeModule {}
