import en from "./messages/en.json";
import ar from "./messages/ar.json";

export type Locale = "en" | "ar";
export const LOCALES: Locale[] = ["en", "ar"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "at_lang";

export type Messages = typeof en;

const DICTS: Record<Locale, Messages> = { en, ar: ar as Messages };

export function getMessages(locale: Locale): Messages {
  return DICTS[locale] ?? DICTS[DEFAULT_LOCALE];
}

export function dir(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "ar";
}

/** Resolve a dotted key (e.g. "dashboard.recent.title") against a messages tree. */
export function lookup(messages: Messages, key: string): string {
  const parts = key.split(".");
  let cur: unknown = messages;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return key; // surface the missing key rather than rendering blank
    }
  }
  return typeof cur === "string" ? cur : key;
}
