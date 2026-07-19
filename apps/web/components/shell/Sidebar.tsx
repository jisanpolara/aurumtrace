"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark, Wordmark } from "@/components/brand/Logo";
import {
  DashboardIcon,
  NewCaseIcon,
  CustomersIcon,
  ReportsIcon,
  AuditIcon,
  SettingsIcon,
} from "@/components/icons";
import { NAV_ITEMS, type NavKey } from "@/lib/nav";
import { useT } from "@/lib/i18n/provider";

const ICONS: Record<NavKey, (p: { size?: number }) => JSX.Element> = {
  dashboard: DashboardIcon,
  newCase: NewCaseIcon,
  customers: CustomersIcon,
  reports: ReportsIcon,
  audit: AuditIcon,
  settings: SettingsIcon,
};

export function Sidebar() {
  const pathname = usePathname();
  const t = useT();

  return (
    <aside
      className="flex w-[248px] flex-none flex-col px-4 py-5"
      style={{
        background: "var(--at-ink-panel)",
        borderInlineEnd: "1px solid var(--at-ink-hairline)",
      }}
    >
      <Link
        href="/dashboard"
        className="mb-[22px] flex items-center gap-[10px] px-2 py-[6px]"
      >
        <BrandMark size={30} />
        <Wordmark size="1.22rem" />
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.key];
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className="flex items-center gap-3 rounded-[10px] px-[14px] py-[11px] text-[.9rem] font-medium transition-colors"
              style={
                active
                  ? {
                      background: "var(--at-ink)",
                      color: "var(--at-gold-light)",
                      boxShadow:
                        "inset 3px 0 0 var(--at-gold), inset 0 0 0 1px var(--at-ink-hairline)",
                    }
                  : { background: "transparent", color: "var(--at-on-ink-muted)" }
              }
            >
              <Icon size={18} />
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div
          className="rounded-[12px] px-[14px] py-[13px]"
          style={{
            background: "var(--at-ink)",
            border: "1px solid var(--at-ink-hairline)",
          }}
        >
          <div className="at-label" style={{ color: "var(--at-text-muted)" }}>
            {t("nav.statusLabel")}
          </div>
          <div className="mt-[7px] flex items-center gap-[7px]">
            <span
              className="h-[7px] w-[7px] rounded-full"
              style={{ background: "var(--at-clear)" }}
            />
            <span className="text-[.8rem]" style={{ color: "var(--at-on-ink-muted)" }}>
              {t("nav.goamlActive")}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
