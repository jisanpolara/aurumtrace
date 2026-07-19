import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { DatabaseModule } from "./common/db/database.module";
import { IntegrationsModule } from "./common/integrations/integrations.module";
import { AuditModule } from "./audit/audit.module";
import { IdentityModule } from "./identity/identity.module";
import { IntakeModule } from "./intake/intake.module";
import { CasesModule } from "./cases/cases.module";
import { ThresholdModule } from "./threshold/threshold.module";
import { ScreeningModule } from "./screening/screening.module";
import { SourcingModule } from "./sourcing/sourcing.module";
import { DocumentsModule } from "./documents/documents.module";
import { ReportModule } from "./reporting/report.module";
import { CustomersModule } from "./customers/customers.module";

@Module({
  imports: [
    DatabaseModule,
    IntegrationsModule,
    AuditModule,
    IdentityModule,
    IntakeModule,
    CasesModule,
    ThresholdModule,
    ScreeningModule,
    SourcingModule,
    DocumentsModule,
    ReportModule,
    CustomersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
