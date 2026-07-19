import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  getMessages,
  isLocale,
  type Locale,
  lookup,
} from "./index";

/** Server-component translator — reads the locale cookie (mirrors the client provider). */
export function getServerT(): { locale: Locale; t: (key: string) => string } {
  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  const messages = getMessages(locale);
  return { locale, t: (key: string) => lookup(messages, key) };
}
