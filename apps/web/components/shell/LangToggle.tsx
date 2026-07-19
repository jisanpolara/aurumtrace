"use client";

import { useI18n } from "@/lib/i18n/provider";

export function LangToggle() {
  const { locale, setLocale } = useI18n();

  const seg = (active: boolean): React.CSSProperties =>
    active
      ? { background: "var(--at-ink-panel)", color: "var(--at-gold-light)" }
      : { background: "transparent", color: "var(--at-text-muted)" };

  return (
    <div
      className="flex rounded-pill p-[3px]"
      style={{ background: "var(--at-bg)", border: "1px solid var(--at-hairline)" }}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className="cursor-pointer rounded-pill border-none px-[14px] py-[6px] text-[.8rem] font-semibold transition-colors"
        style={seg(locale === "en")}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("ar")}
        aria-pressed={locale === "ar"}
        className="cursor-pointer rounded-pill border-none px-[14px] py-[6px] text-[.8rem] font-semibold transition-colors"
        style={seg(locale === "ar")}
      >
        العربية
      </button>
    </div>
  );
}
