"use client";

import { BellIcon } from "@/components/icons";
import { LangToggle } from "./LangToggle";
import { useT } from "@/lib/i18n/provider";
import { ORG, CURRENT_USER } from "@/lib/mock-data";
import { signOut } from "@/app/(app)/actions";

export function Topbar() {
  const t = useT();

  return (
    <header
      className="flex h-16 flex-none items-center justify-between gap-4 px-7"
      style={{
        background: "var(--at-card)",
        borderBottom: "1px solid var(--at-hairline)",
      }}
    >
      <div className="flex min-w-0 items-center gap-[11px]">
        <span className="whitespace-nowrap font-display text-[1.02rem] font-semibold text-text">
          {ORG.name}
        </span>
        <span
          className="rounded-pill px-2 py-[3px] text-[.66rem] font-bold tracking-[.1em]"
          style={{ color: "var(--at-gold-deep)", background: "var(--at-gold-wash)" }}
        >
          {ORG.badge}
        </span>
      </div>

      <div className="flex items-center gap-[14px]">
        <LangToggle />

        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-[38px] w-[38px] items-center justify-center rounded-[10px] text-text-muted"
          style={{ background: "var(--at-card-alt)", border: "1px solid var(--at-hairline)" }}
        >
          <BellIcon size={18} />
          <span
            className="absolute right-[7px] top-[6px] h-2 w-2 rounded-full"
            style={{ background: "var(--at-flag)", border: "1.5px solid var(--at-card-alt)" }}
          />
        </button>

        <div className="flex items-center gap-[10px] ps-[6px]">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full font-display text-[.85rem] font-semibold"
            style={{
              background: "linear-gradient(145deg,#31353F,#16181D)",
              color: "var(--at-gold-light)",
            }}
          >
            {CURRENT_USER.initials}
          </div>
          <div className="leading-tight">
            <div className="text-[.85rem] font-semibold text-text">{CURRENT_USER.name}</div>
            <div className="text-[.72rem] text-text-muted">{t("topbar.role")}</div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="ms-1 cursor-pointer rounded-[8px] border-none bg-transparent px-2 py-1 text-[.72rem] font-semibold text-text-faint hover:text-text-muted"
            >
              {t("topbar.signOut")}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
