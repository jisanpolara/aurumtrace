import { apiGet, type ApiReportRow } from "@/lib/api";
import { aedFromFils } from "@/lib/format";
import { getServerT } from "@/lib/i18n/server";
import { ComingSoon } from "@/components/ui/ComingSoon";

const STATUS_CLS: Record<string, string> = {
  draft: "warn",
  pending_review: "warn",
  filed: "clear",
};
const STATUS_KEY: Record<string, string> = {
  draft: "draft",
  pending_review: "pendingReview",
  filed: "filed",
};

export default async function ReportsPage() {
  const reports = await apiGet<ApiReportRow[]>("/reports");
  if (reports === null) return <ComingSoon titleKey="nav.reports" />;
  const { t } = getServerT();

  const th =
    "px-[14px] py-[11px] text-[.66rem] font-semibold uppercase tracking-[.1em] text-on-ink-muted";

  return (
    <div className="animate-at-rise">
      <div className="mb-6">
        <div className="at-label">{t("reports.eyebrow")}</div>
        <h1 className="mt-[5px] font-display text-[1.85rem] font-semibold text-text">
          {t("reports.title")}
        </h1>
      </div>
      <div className="at-card overflow-hidden">
        <table className="w-full border-collapse text-[.85rem]">
          <thead>
            <tr style={{ background: "var(--at-ink)" }}>
              <th className={`${th} text-start ps-5`}>{t("reports.col.reference")}</th>
              <th className={`${th} text-start`}>{t("reports.col.type")}</th>
              <th className={`${th} text-start`}>{t("reports.col.customer")}</th>
              <th className={`${th} text-end`}>{t("reports.col.valueAed")}</th>
              <th className={`${th} pe-5 text-start`}>{t("reports.col.status")}</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r, i) => {
              const cls = STATUS_CLS[r.status] ?? "warn";
              const statusKey = STATUS_KEY[r.status] ?? "draft";
              return (
                <tr
                  key={r.id}
                  style={{
                    background: i % 2 ? "var(--at-card-alt)" : "var(--at-card)",
                    borderBottom: "1px solid var(--at-hairline)",
                  }}
                >
                  <td className="at-mono py-[13px] ps-5 text-[.78rem] text-text-muted">
                    {r.reference ?? "—"}
                  </td>
                  <td className="py-[13px] font-medium text-text">{r.reportType}</td>
                  <td className="py-[13px] text-text-muted">{r.customer ?? "—"}</td>
                  <td className="at-mono py-[13px] text-end text-text">{aedFromFils(r.valueFils)}</td>
                  <td className="py-[13px] pe-5">
                    <span className={`at-pill ${cls}`}>{t(`reports.status.${statusKey}`)}</span>
                  </td>
                </tr>
              );
            })}
            {reports.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-[.85rem] text-text-muted">
                  {t("reports.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
