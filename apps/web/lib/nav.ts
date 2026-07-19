/** Primary product navigation. Order and labels mirror docs/design. */
export type NavKey =
  | "dashboard"
  | "newCase"
  | "customers"
  | "reports"
  | "audit"
  | "settings";

export type NavItem = {
  key: NavKey;
  href: string;
  /** i18n key under `nav`. */
  labelKey: string;
  /** Built in this step? Unbuilt items render a "planned" placeholder. */
  ready: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", href: "/dashboard", labelKey: "nav.dashboard", ready: true },
  { key: "newCase", href: "/cases/new", labelKey: "nav.newCase", ready: false },
  { key: "customers", href: "/customers", labelKey: "nav.customers", ready: false },
  { key: "reports", href: "/reports", labelKey: "nav.reports", ready: false },
  { key: "audit", href: "/audit", labelKey: "nav.audit", ready: false },
  { key: "settings", href: "/settings", labelKey: "nav.settings", ready: false },
];
