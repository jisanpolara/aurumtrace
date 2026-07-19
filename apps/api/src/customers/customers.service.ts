import { Inject, Injectable } from "@nestjs/common";
import type { Principal } from "@aurumtrace/shared";
import { TENANT_DATABASE, type TenantDatabase } from "../common/db/tenant-database";

export type CustomerListRow = {
  id: string;
  fullName: string;
  emiratesId: string | null;
  residencyStatus: string | null;
  riskRating: string;
  caseCount: number;
  lastSeen: string | null;
};

type Row = {
  id: string;
  full_name: string;
  emirates_id: string | null;
  residency_status: string | null;
  risk_rating: string;
  case_count: string;
  last_seen: string | Date | null;
};

@Injectable()
export class CustomersService {
  constructor(@Inject(TENANT_DATABASE) private readonly db: TenantDatabase) {}

  /** Customer directory for the active tenant (RLS-scoped). */
  async list(principal: Principal): Promise<CustomerListRow[]> {
    return this.db.withTenant(principal, async (q) => {
      const res = await q.query<Row>(
        `select cu.id, cu.full_name, cu.emirates_id, cu.residency_status, cu.risk_rating,
                count(c.id)::int as case_count, max(c.created_at) as last_seen
           from public.customers cu
           left join public.cases c
             on c.customer_id = cu.id and c.tenant_id = cu.tenant_id
          group by cu.id
          order by cu.created_at desc`,
      );
      return res.rows.map((r) => ({
        id: r.id,
        fullName: r.full_name,
        emiratesId: r.emirates_id,
        residencyStatus: r.residency_status,
        riskRating: r.risk_rating,
        caseCount: Number(r.case_count),
        lastSeen:
          r.last_seen == null
            ? null
            : r.last_seen instanceof Date
              ? r.last_seen.toISOString()
              : String(r.last_seen),
      }));
    });
  }
}
