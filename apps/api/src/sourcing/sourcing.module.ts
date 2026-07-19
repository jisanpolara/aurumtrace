import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { SourcingService } from "./sourcing.service";
import { SourcingController } from "./sourcing.controller";

@Module({
  imports: [AuditModule],
  providers: [SourcingService],
  controllers: [SourcingController],
})
export class SourcingModule {}
