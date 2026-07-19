"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  type Locale,
  type Messages,
  LOCALE_COOKIE,
  lookup,
} from "./index";

type I18nContextValue = {
  locale: Locale;
  messages: Messages;
  t: (key: string) => string;
  setLocale: (next: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const t = useCallback((key: string) => lookup(messages, key), [messages]);

  const setLocale = useCallback(
    (next: Locale) => {
      // 1 year, root path — picked up by the server layout on next render.
      document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;samesite=lax`;
      router.refresh();
    },
    [router],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, messages, t, setLocale }),
    [locale, messages, t, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}

/** Convenience: just the translate function. */
export function useT(): (key: string) => string {
  return useI18n().t;
}
