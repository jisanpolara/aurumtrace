import { Inject, Injectable } from "@nestjs/common";
import type { Principal } from "@aurumtrace/shared";
import { TENANT_DATABASE, type TenantDatabase } from "../common/db/tenant-database";

export type CaseListRow = {
  id: string;
  reference: string;
  customer: string | null;
  item: string | null;
  valueFils: number | null;
  stage: number;
  status: string;
  createdAt: string;
};

type Row = {
  id: string;
  reference: string;
  customer: string | null;
  item_type: string | null;
  weight_grams: string | null;
  purity_karat: number | null;
  value_fils: string | null;
  stage: number;
  status: string;
  created_at: string | Date;
};

export type DashboardSummary = {
  kpis: {
    casesToday: number;
    reportsPending: number;
    flaggedCustomers: number;
    filingsMonth: number;
  };
  pipeline: { stage: number; count: number }[];
};

@Injectable()
export class CasesService {
  constructor(@Inject(TENANT_DATABASE) private readonly db: TenantDatabase) {}

  /** Dashboard KPI + pipeline counts for the active tenant (RLS-scoped). */
  async summary(principal: Principal): Promise<DashboardSummary> {
    return this.db.withTenant(principal, async (q) => {
      const k = await q.query<{
        cases_today: number;
        reports_pending: number;
        flagged_customers: number;
        filings_month: number;
      }>(
        `select
           (select count(*) from public.cases where created_at::date = current_date)::int as cases_today,
           (select count(*) from public.reports where status = 'pending_review')::int as reports_pending,
           (select count(*) from public.customers where risk_rating = 'high')::int as flagged_customers,
           (select count(*) from public.reports
              where status = 'filed' and filed_at >= date_trunc('month', now()))::int as filings_month`,
      );
      const p = await q.query<{ stage: number; n: number }>(
        `select stage, count(*)::int as n from public.cases group by stage order by stage`,
      );
      const row = k.rows[0]!;
      return {
        kpis: {
          casesToday: row.cases_today,
          reportsPending: row.reports_pending,
          flaggedCustomers: row.flagged_customers,
          filingsMonth: row.filings_month,
        },
        pipeline: p.rows.map((r) => ({ stage: r.stage, count: Number(r.n) })),
      };
    });
  }

  /** Recent cases for the active tenant (RLS-scoped), newest first. */
  async listRecent(principal: Principal, limit = 10): Promise<CaseListRow[]> {
    return this.db.withTenant(principal, async (q) => {
      const res = await q.query<Row>(
        `select c.id, c.reference, c.stage, c.status, c.created_at,
                cu.full_name as customer,
                i.item_type, i.weight_grams, i.purity_karat, i.value_fils
           from public.cases c
           left join public.customers cu
             on cu.id = c.customer_id and cu.tenant_id = c.tenant_id
           left join lateral (
             select item_type, weight_grams, purity_karat, value_fils
               from public.items
              where case_id = c.id and tenant_id = c.tenant_id
              order by created_at asc limit 1
           ) i on true
          order by c.created_at desc
          limit $1`,
        [limit],
      );
      return res.rows.map((r) => ({
        id: r.id,
        reference: r.reference,
        customer: r.customer,
        item:
          r.item_type && r.weight_grams
            ? `${Number(r.weight_grams)} g · ${r.purity_karat ?? "?"}K ${r.item_type}`
            : null,
        valueFils: r.value_fils === null ? null : Number(r.value_fils),
        stage: r.stage,
        status: r.status,
        createdAt:
          r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      }));
    });
  }
}
