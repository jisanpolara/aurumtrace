import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../common/auth/auth.guard";
import { CurrentPrincipal, type Principal } from "../common/principal";
import { TENANT_DATABASE, type TenantDatabase } from "../common/db/tenant-database";

/**
 * Proves the tenant-context + RLS path: selecting all tenants under a principal
 * returns exactly their own tenant (RLS filters the rest), never a cross-tenant row.
 */
@Controller("me")
@UseGuards(AuthGuard)
export class IdentityController {
  constructor(
    @Inject(TENANT_DATABASE) private readonly db: TenantDatabase,
  ) {}

  @Get()
  async me(@CurrentPrincipal() principal: Principal) {
    const tenant = await this.db.withTenant(principal, async (client) => {
      const res = await client.query(
        `select id, legal_name, licence_authority, licence_no, goaml_org_id
           from public.tenants`,
      );
      return res.rows[0] ?? null;
    });
    return { principal, tenant };
  }
}
