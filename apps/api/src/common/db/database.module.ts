import { Global, Module } from "@nestjs/common";
import { PgPoolDatabase } from "./database.service";
import { TENANT_DATABASE } from "./tenant-database";

/**
 * Provides the TenantDatabase. Production uses the pg connection pool. Tests
 * (and a future local dev mode) override the TENANT_DATABASE token with a
 * PGlite-backed implementation — see src/common/testing/pglite-database.ts.
 */
@Global()
@Module({
  providers: [
    PgPoolDatabase,
    { provide: TENANT_DATABASE, useExisting: PgPoolDatabase },
  ],
  exports: [TENANT_DATABASE],
})
export class DatabaseModule {}
