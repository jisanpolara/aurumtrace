import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "@/lib/i18n";
import { apiGet, type ApiCaseRow, type ApiDashboardSummary } from "@/lib/api";
import { aedFromFils } from "@/lib/format";
import { RECENT_CASES, type DashboardCase, type CaseStatus } from "@/lib/mock-data";
import DashboardView from "./DashboardView";

const STAGE_NAME: Record<number, string> = {
  1: "Intake",
  2: "KYC / CDD",
  3: "Threshold",
  4: "Sourcing",
  5: "Report",
  6: "Complete",
};

function mapStatus(status: string): { tone: CaseStatus; key: DashboardCase["statusKey"] } {
  switch (status) {
    case "reportable":
    case "filed":
      return { tone: "flag", key: "reportable" };
    case "cleared":
      return { tone: "clear", key: "cleared" };
    default:
      return { tone: "warn", key: "inReview" };
  }
}

function toDashboardCase(r: ApiCaseRow): DashboardCase {
  const { tone, key } = mapStatus(r.status);
  return {
    id: r.reference,
    customer: r.customer ?? "—",
    item: r.item ?? "—",
    value: aedFromFils(r.valueFils),
    stage: `${r.stage} · ${STAGE_NAME[r.stage] ?? ""}`.trim(),
    status: tone,
    statusKey: key,
    date: new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(
      new Date(r.createdAt),
    ),
    href: `/cases/${r.id}/kyc`,
  };
}

export default async function DashboardPage() {
  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  const today = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(2026, 5, 22));

  // Live cases + KPI/pipeline summary from the API when configured; else mock.
  const [live, summary] = await Promise.all([
    apiGet<ApiCaseRow[]>("/cases?limit=10"),
    apiGet<ApiDashboardSummary>("/dashboard/summary"),
  ]);
  const cases = live ? live.map(toDashboardCase) : RECENT_CASES;

  return <DashboardView today={today} cases={cases} summary={summary} />;
}
