"use client";

import { HallmarkOutline } from "@/components/icons";
import { useT } from "@/lib/i18n/provider";

/** Placeholder for nav destinations whose screens land in a later build step. */
export function ComingSoon({ titleKey }: { titleKey: string }) {
  const t = useT();
  return (
    <div className="animate-at-rise">
      <div className="mb-6">
        <div className="at-label">{t("comingSoon.eyebrow")}</div>
        <h1 className="mt-[5px] font-display text-[1.85rem] font-semibold text-text">
          {t(titleKey)}
        </h1>
      </div>
      <div className="at-card flex max-w-[560px] items-start gap-4 p-6">
        <div
          className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-[14px]"
          style={{ background: "var(--at-bg)", border: "1px solid var(--at-hairline)" }}
        >
          <HallmarkOutline size={24} />
        </div>
        <p className="m-0 text-[.9rem] leading-relaxed text-text-muted">
          {t("comingSoon.body")}
        </p>
      </div>
    </div>
  );
}
