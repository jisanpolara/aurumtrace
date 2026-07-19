import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { ReportService } from "./report.service";
import { ReportController } from "./report.controller";

@Module({
  imports: [AuditModule],
  providers: [ReportService],
  controllers: [ReportController],
})
export class ReportModule {}
