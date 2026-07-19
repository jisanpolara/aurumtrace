/**
 * Mock dashboard data — mirrors the values in docs/design so the Foundations
 * UI is demoable. This is the seam where the real API/Supabase queries land in
 * later steps; shape it like the eventual DTOs.
 *
 * NOTE: `value` here is a pre-formatted display string lifted from the design.
 * The real model stores money in integer fils (per CLAUDE.md) and formats at
 * the edge; this stand-in keeps the visual exact until the API exists.
 */

export type CaseStatus = "flag" | "warn" | "clear";

export type DashboardCase = {
  id: string;
  customer: string;
  item: string;
  value: string;
  /** Stage label, pre-localised key + display. Kept as design string for now. */
  stage: string;
  status: CaseStatus;
  /** i18n key under `status`. */
  statusKey: "reportable" | "inReview" | "cleared";
  date: string;
  /** Link to the case (live rows only); mock rows are not navigable. */
  href?: string;
};

export const RECENT_CASES: DashboardCase[] = [
  { id: "AT-2026-000148", customer: "Rashid A.", item: "250 g · 22K bar", value: "61,400", stage: "3 · Threshold", status: "flag", statusKey: "reportable", date: "22 Jun" },
  { id: "AT-2026-000147", customer: "Mariam S.", item: "120 g · 24K coins", value: "29,800", stage: "2 · KYC / CDD", status: "warn", statusKey: "inReview", date: "22 Jun" },
  { id: "AT-2026-000146", customer: "Imran K.", item: "500 g · 21K bars", value: "118,650", stage: "5 · Report", status: "flag", statusKey: "reportable", date: "21 Jun" },
  { id: "AT-2026-000145", customer: "Layla H.", item: "40 g · 18K jewellery", value: "7,920", stage: "6 · Complete", status: "clear", statusKey: "cleared", date: "21 Jun" },
  { id: "AT-2026-000144", customer: "Omar B.", item: "310 g · 22K bar", value: "76,140", stage: "4 · Sourcing", status: "warn", statusKey: "inReview", date: "20 Jun" },
  { id: "AT-2026-000143", customer: "Fatima D.", item: "85 g · 24K bar", value: "21,930", stage: "6 · Complete", status: "clear", statusKey: "cleared", date: "20 Jun" },
];

export type Kpi = {
  /** i18n key under `dashboard.kpi`. */
  labelKey: string;
  subKey: string;
  value: string;
  tone: "neutral" | "warn" | "flag" | "clear";
};

export const KPIS: Kpi[] = [
  { labelKey: "casesToday", subKey: "casesTodaySub", value: "7", tone: "neutral" },
  { labelKey: "reportsPending", subKey: "reportsPendingSub", value: "3", tone: "warn" },
  { labelKey: "flaggedCustomers", subKey: "flaggedCustomersSub", value: "2", tone: "flag" },
  { labelKey: "filingsMonth", subKey: "filingsMonthSub", value: "18", tone: "clear" },
];

export type PipelineStage = {
  n: string;
  /** i18n key under `dashboard.pipeline.stage`. */
  nameKey: string;
  count: number;
  active: boolean;
};

export const PIPELINE: PipelineStage[] = [
  { n: "1", nameKey: "intake", count: 2, active: false },
  { n: "2", nameKey: "kyc", count: 1, active: false },
  { n: "3", nameKey: "threshold", count: 1, active: true },
  { n: "4", nameKey: "sourcing", count: 1, active: false },
  { n: "5", nameKey: "report", count: 3, active: true },
  { n: "6", nameKey: "audit", count: 9, active: false },
];

/** Acting tenant + user — stand-in until tenancy/auth land. */
export const ORG = { name: "Al Noor Gold Trading LLC", badge: "DMCC" };
export const CURRENT_USER = { name: "Yousef R.", initials: "YR" };
