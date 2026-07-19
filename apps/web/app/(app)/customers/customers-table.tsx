"use client";

import { useMemo, useState } from "react";
import type { ApiCustomerRow } from "@/lib/api";
import { useT } from "@/lib/i18n/provider";

const RISK_CLS: Record<string, string> = {
  low: "clear",
  medium: "warn",
  high: "flag",
  unrated: "warn",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

export function CustomersTable({ customers }: { customers: ApiCustomerRow[] }) {
  const t = useT();
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return customers;
    return customers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(t) ||
        (c.emiratesId ?? "").toLowerCase().includes(t),
    );
  }, [q, customers]);

  const th =
    "px-[14px] py-[11px] text-[.66rem] font-semibold uppercase tracking-[.1em] text-on-ink-muted";

  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="at-label">{t("customers.eyebrow")}</div>
          <h1 className="mt-[5px] font-display text-[1.85rem] font-semibold text-text">
            {t("customers.title")}
          </h1>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("customers.search")}
          className="w-[280px] rounded-[10px] border border-hairline bg-card px-[14px] py-[9px] text-[.85rem] text-text outline-none focus:border-gold"
        />
      </div>

      <div className="at-card overflow-hidden">
        <table className="w-full border-collapse text-[.85rem]">
          <thead>
            <tr style={{ background: "var(--at-ink)" }}>
              <th className={`${th} text-start ps-5`}>{t("customers.col.customer")}</th>
              <th className={`${th} text-start`}>{t("customers.col.emiratesId")}</th>
              <th className={`${th} text-start`}>{t("customers.col.type")}</th>
              <th className={`${th} text-end`}>{t("customers.col.cases")}</th>
              <th className={`${th} text-start`}>{t("customers.col.risk")}</th>
              <th className={`${th} pe-5 text-end`}>{t("customers.col.lastSeen")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => {
              const riskCls = RISK_CLS[c.riskRating] ?? "warn";
              return (
                <tr
                  key={c.id}
                  style={{
                    background: i % 2 ? "var(--at-card-alt)" : "var(--at-card)",
                    borderBottom: "1px solid var(--at-hairline)",
                  }}
                >
                  <td className="py-[13px] ps-5">
                    <div className="flex items-center gap-[11px]">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full font-display text-[.78rem] font-semibold"
                        style={{ background: "linear-gradient(145deg,#31353F,#16181D)", color: "var(--at-gold-light)" }}
                      >
                        {initials(c.fullName)}
                      </span>
                      <span className="font-semibold text-text">{c.fullName}</span>
                    </div>
                  </td>
                  <td className="at-mono py-[13px] text-[.78rem] text-text-muted">
                    {c.emiratesId ?? "—"}
                  </td>
                  <td className="py-[13px] text-text-muted">
                    {c.residencyStatus === "non_resident"
                      ? t("customers.type.nonResident")
                      : c.residencyStatus === "resident"
                        ? t("customers.type.resident")
                        : "—"}
                  </td>
                  <td className="at-mono py-[13px] text-end text-text">{c.caseCount}</td>
                  <td className="py-[13px]">
                    <span className={`at-pill ${riskCls}`}>
                      {t(`customers.risk.${c.riskRating in RISK_CLS ? c.riskRating : "unrated"}`)}
                    </span>
                  </td>
                  <td className="py-[13px] pe-5 text-end text-[.8rem] text-text-faint">
                    {c.lastSeen
                      ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(c.lastSeen))
                      : "—"}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-[.85rem] text-text-muted">
                  {t("customers.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
