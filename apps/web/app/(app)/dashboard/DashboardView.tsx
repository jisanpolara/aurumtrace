"use client";

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/provider";
import { KpiCard } from "@/components/ui/KpiCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { HallmarkOutline, AlertIcon, PlusIcon } from "@/components/icons";
import { KPIS, RECENT_CASES, PIPELINE, type DashboardCase, type Kpi, type PipelineStage } from "@/lib/mock-data";
import type { ApiDashboardSummary } from "@/lib/api";

type DashState = "data" | "empty" | "loading" | "error";

/**
 * `today` is formatted on the server and passed in so SSR and client render
 * identical text (Node and browser ICU can differ on separators). `cases` come
 * live from the API when configured, else the mock set.
 */
export default function DashboardView({
  today,
  cases = RECENT_CASES,
  summary,
}: {
  today: string;
  cases?: DashboardCase[];
  summary?: ApiDashboardSummary | null;
}) {
  const t = useT();
  const [state, setState] = useState<DashState>("data");

  // Live KPIs/pipeline when the API is configured; otherwise the mock set.
  const kpiList: Kpi[] = summary
    ? KPIS.map((k, i) => ({
        ...k,
        value: String(
          [
            summary.kpis.casesToday,
            summary.kpis.reportsPending,
            summary.kpis.flaggedCustomers,
            summary.kpis.filingsMonth,
          ][i] ?? k.value,
        ),
      }))
    : KPIS;
  const pipelineList: PipelineStage[] = summary
    ? PIPELINE.map((p) => {
        const count = summary.pipeline.find((s) => s.stage === Number(p.n))?.count ?? 0;
        return { ...p, count, active: count > 0 };
      })
    : PIPELINE;

  return (
    <div className="animate-at-rise">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between gap-5">
        <div>
          <div className="at-label">{today}</div>
          <h1 className="mt-[5px] font-display text-[1.85rem] font-semibold text-text">
            {t("dashboard.title")}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <StateSwitch state={state} setState={setState} t={t} />
          <Link href="/cases/new" className="at-btn at-btn-primary">
            <PlusIcon size={16} />
            {t("dashboard.newCase")}
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-4 gap-[18px]">
        {kpiList.map((k) => (
          <KpiCard
            key={k.labelKey}
            label={t(`dashboard.kpi.${k.labelKey}`)}
            value={k.value}
            sub={t(`dashboard.kpi.${k.subKey}`)}
            tone={k.tone}
          />
        ))}
      </div>

      {/* Cases + pipeline */}
      <div className="grid grid-cols-[1.9fr_1fr] items-start gap-[18px]">
        <section className="at-card overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid var(--at-hairline)" }}
          >
            <h2 className="font-display text-[1.1rem] font-semibold text-text">
              {t("dashboard.recent.title")}
            </h2>
            <span className="cursor-pointer text-[.78rem] text-text-faint">
              {t("dashboard.recent.viewAll")}
            </span>
          </div>
          {state === "data" && <CasesTable t={t} cases={cases} />}
          {state === "loading" && <CasesSkeleton />}
          {state === "empty" && <CasesEmpty t={t} />}
          {state === "error" && <CasesError t={t} onRetry={() => setState("data")} />}
        </section>

        <Pipeline t={t} pipeline={pipelineList} />
      </div>
    </div>
  );
}

/* ---------- header state switch ---------- */
function StateSwitch({
  state,
  setState,
  t,
}: {
  state: DashState;
  setState: (s: DashState) => void;
  t: (k: string) => string;
}) {
  const opts: DashState[] = ["data", "empty", "loading", "error"];
  return (
    <div
      className="flex rounded-[10px] p-[3px]"
      style={{ background: "var(--at-card)", border: "1px solid var(--at-hairline)" }}
      role="group"
      aria-label="Dashboard state"
    >
      {opts.map((o) => {
        const active = state === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => setState(o)}
            aria-pressed={active}
            className="cursor-pointer rounded-[8px] border-none px-[13px] py-[6px] text-[.78rem] font-semibold transition-colors"
            style={
              active
                ? { background: "var(--at-ink-panel)", color: "var(--at-gold-light)" }
                : { background: "transparent", color: "var(--at-text-muted)" }
            }
          >
            {t(`dashboard.state.${o}`)}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- cases: table ---------- */
function CasesTable({ t, cases }: { t: (k: string) => string; cases: DashboardCase[] }) {
  const th =
    "px-[14px] py-[10px] text-[.66rem] font-semibold uppercase tracking-[.1em] text-on-ink-muted";
  return (
    <table className="w-full border-collapse text-[.85rem]">
      <thead>
        <tr style={{ background: "var(--at-ink)" }}>
          <th className={`${th} text-start ps-5`}>{t("dashboard.recent.col.reference")}</th>
          <th className={`${th} text-start`}>{t("dashboard.recent.col.customer")}</th>
          <th className={`${th} text-start`}>{t("dashboard.recent.col.item")}</th>
          <th className={`${th} text-end`}>{t("dashboard.recent.col.valueAed")}</th>
          <th className={`${th} text-start`}>{t("dashboard.recent.col.stage")}</th>
          <th className={`${th} text-start`}>{t("dashboard.recent.col.status")}</th>
          <th className={`${th} pe-5 text-end`}>{t("dashboard.recent.col.date")}</th>
        </tr>
      </thead>
      <tbody>
        {cases.map((c, i) => (
          <tr
            key={c.id}
            style={{
              background: i % 2 ? "var(--at-card-alt)" : "var(--at-card)",
              borderBottom: "1px solid var(--at-hairline)",
            }}
          >
            <td className="at-mono py-[13px] ps-5 text-[.78rem] text-text-muted">
              {c.href ? (
                <Link href={c.href} className="hover:text-gold-deep hover:underline">
                  {c.id}
                </Link>
              ) : (
                c.id
              )}
            </td>
            <td className="py-[13px] font-semibold text-text">{c.customer}</td>
            <td className="py-[13px] text-text-muted">{c.item}</td>
            <td className="at-mono py-[13px] text-end font-medium text-text">{c.value}</td>
            <td className="py-[13px] text-[.8rem] text-text-muted">{c.stage}</td>
            <td className="py-[13px]">
              <StatusPill tone={c.status} label={t(`status.${c.statusKey}`)} withDot={false} />
            </td>
            <td className="py-[13px] pe-5 text-end text-[.8rem] text-text-faint">{c.date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---------- cases: loading ---------- */
function CasesSkeleton() {
  return (
    <div className="px-5 py-[14px]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 py-[11px]"
          style={{ borderBottom: "1px solid var(--at-hairline-soft)" }}
        >
          <Bar w={90} d={0} />
          <Bar w={120} d={0.15} />
          <div className="flex-1">
            <Bar full d={0.3} light />
          </div>
          <div className="h-5 w-[70px] animate-at-pulse rounded-pill" style={{ background: "#EEE9DC", animationDelay: ".45s" }} />
        </div>
      ))}
    </div>
  );
}
function Bar({ w, full, d, light }: { w?: number; full?: boolean; d: number; light?: boolean }) {
  return (
    <div
      className="h-3 animate-at-pulse rounded-[6px]"
      style={{
        width: full ? "100%" : w,
        background: light ? "#F3EEE2" : "#EEE9DC",
        animationDelay: `${d}s`,
      }}
    />
  );
}

/* ---------- cases: empty ---------- */
function CasesEmpty({ t }: { t: (k: string) => string }) {
  return (
    <div className="px-[30px] py-[60px] text-center">
      <div
        className="mx-auto mb-[18px] flex h-[62px] w-[62px] items-center justify-center rounded-[16px]"
        style={{ background: "var(--at-bg)", border: "1px solid var(--at-hairline)" }}
      >
        <HallmarkOutline size={28} />
      </div>
      <div className="font-display text-[1.15rem] font-semibold text-text">
        {t("dashboard.recent.empty.title")}
      </div>
      <div className="mx-auto mb-5 mt-[6px] max-w-[300px] text-[.85rem] text-text-muted">
        {t("dashboard.recent.empty.body")}
      </div>
      <Link href="/cases/new" className="at-btn at-btn-primary">
        <PlusIcon size={16} />
        {t("dashboard.recent.empty.cta")}
      </Link>
    </div>
  );
}

/* ---------- cases: error ---------- */
function CasesError({ t, onRetry }: { t: (k: string) => string; onRetry: () => void }) {
  return (
    <div className="px-[30px] py-[54px] text-center">
      <div
        className="mx-auto mb-[18px] flex h-[62px] w-[62px] items-center justify-center rounded-[16px]"
        style={{ background: "var(--at-flag-wash)" }}
      >
        <AlertIcon size={28} />
      </div>
      <div className="font-display text-[1.15rem] font-semibold text-text">
        {t("dashboard.recent.error.title")}
      </div>
      <div className="mx-auto mb-5 mt-[6px] max-w-[320px] text-[.85rem] text-text-muted">
        {t("dashboard.recent.error.body")}
      </div>
      <button type="button" onClick={onRetry} className="at-btn at-btn-secondary">
        {t("dashboard.recent.error.retry")}
      </button>
    </div>
  );
}

/* ---------- pipeline ---------- */
function Pipeline({ t, pipeline }: { t: (k: string) => string; pipeline: PipelineStage[] }) {
  return (
    <section className="at-card p-5">
      <h2 className="font-display text-[1.1rem] font-semibold text-text">
        {t("dashboard.pipeline.title")}
      </h2>
      <div className="mb-[18px] mt-1 text-[.78rem] text-text-faint">
        {t("dashboard.pipeline.subtitle")}
      </div>
      <div className="flex flex-col gap-[3px]">
        {pipeline.map((p) => (
          <div
            key={p.n}
            className="flex items-center gap-3 rounded-[10px] p-[10px]"
            style={{ background: p.active ? "var(--at-gold-wash)" : "transparent" }}
          >
            <div
              className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[8px] font-display text-[.82rem] font-semibold"
              style={{
                background: p.active ? "var(--at-gold-gradient)" : "var(--at-bg)",
                color: p.active ? "var(--at-on-gold)" : "var(--at-text-faint)",
              }}
            >
              {p.n}
            </div>
            <div className="min-w-0 flex-1 text-[.85rem] font-medium text-text">
              {t(`dashboard.pipeline.stage.${p.nameKey}`)}
            </div>
            <div
              className="at-mono text-[.82rem] font-semibold"
              style={{ color: p.count > 2 ? "var(--at-gold-deep)" : "var(--at-text-muted)" }}
            >
              {p.count}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
