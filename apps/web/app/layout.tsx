import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/provider";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  dir,
  getMessages,
  isLocale,
} from "@/lib/i18n";

export const metadata: Metadata = {
  title: "AurumTrace — Compliance console",
  description:
    "AML compliance for UAE gold and precious-metals dealers — DPMS / goAML.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  const messages = getMessages(locale);

  return (
    <html lang={locale} dir={dir(locale)}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <I18nProvider locale={locale} messages={messages}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
