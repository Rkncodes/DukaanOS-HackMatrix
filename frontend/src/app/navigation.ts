import type { MessageKey } from "../i18n";
import type { IconName } from "./icons";

/**
 * The merchant app's information architecture, in one place. The top bar lists the sections; under it sit
 * the pages of whichever section the current page belongs to. The Dashboard and the Counter have none: each
 * is one page (the Counter switches its billing inputs itself). Routes live in router.tsx: every `to` here is a route there.
 */

export type NavItem = {
  to: string;
  /** The item's name in English, and the key of its name in the chosen language. */
  label: string;
  key: MessageKey;
  icon: IconName;
  /** Other paths that belong to this item (it stays highlighted on them). */
  also?: string[];
};
export type NavGroup = { title: string; titleKey: MessageKey; items: NavItem[] };
export type NavSection = { id: string; label: string; key: MessageKey; icon: IconName; to: string; groups: NavGroup[] };

export const SECTIONS: NavSection[] = [
  {
    id: "dashboard",
    label: "Dashboard", key: "nav.dashboard",
    icon: "grid",
    to: "/",
    groups: [],
  },
  {
    id: "counter",
    label: "Counter", key: "nav.counter",
    icon: "cart",
    to: "/counter",
    // Every billing input (vision, code, photo, parchi, voice, manual) is the one Counter page: it switches between them itself.
    groups: [],
  },
  {
    id: "catalogue",
    label: "Catalogue", key: "nav.catalogue",
    icon: "box",
    to: "/catalogue/products",
    groups: [
      {
        title: "Catalogue", titleKey: "nav.catalogue",
        items: [
          { to: "/catalogue/products", label: "Products", key: "nav.products", icon: "box", also: ["/catalogue"] },
          { to: "/catalogue/categories", label: "Categories", key: "nav.categories", icon: "tag" },
          { to: "/catalogue/stock", label: "Stock", key: "nav.stock", icon: "stack" },
          { to: "/catalogue/offers", label: "Offers", key: "nav.offers", icon: "percent" },
        ],
      },
    ],
  },
  {
    id: "shop",
    label: "Shop", key: "nav.shop",
    icon: "store",
    to: "/shop/orders",
    groups: [
      {
        title: "Shop", titleKey: "nav.shop",
        items: [
          { to: "/shop/orders", label: "Orders", key: "nav.orders", icon: "clipboard", also: ["/shop"] },
          { to: "/shop/storefront", label: "Storefront", key: "nav.storefront", icon: "store" },
          { to: "/shop/qr", label: "QR", key: "nav.qr", icon: "qr" },
        ],
      },
    ],
  },
  {
    id: "khata",
    label: "Khata", key: "nav.khata",
    icon: "book",
    to: "/khata",
    groups: [
      {
        title: "Khata", titleKey: "nav.khata",
        items: [
          // A customer's own page (/khata/:customerId) sits under Customers.
          { to: "/khata", label: "Customers", key: "nav.customers", icon: "users" },
          { to: "/khata/ledger", label: "Ledger", key: "nav.ledger", icon: "book" },
          { to: "/khata/outstanding", label: "Outstanding", key: "nav.outstanding", icon: "clock" },
          { to: "/khata/payments", label: "Payments", key: "nav.payments", icon: "wallet" },
        ],
      },
    ],
  },
  {
    id: "insights",
    label: "Insights", key: "nav.insights",
    icon: "chart",
    to: "/insights",
    groups: [
      {
        title: "Insights", titleKey: "nav.insights",
        items: [
          { to: "/insights", label: "Opportunities", key: "nav.opportunities", icon: "sparkle" },
          { to: "/analytics", label: "Analytics", key: "nav.analytics", icon: "chart" },
        ],
      },
    ],
  },
];

/** The Dashboard is home: the logo leads to it too, beside its own place first among the top bar's sections. */
export const HOME = SECTIONS[0];
export const TOP_BAR_SECTIONS = SECTIONS;

/** How much of `pathname` the path `base` covers: its length when it is the page or an ancestor, else -1. */
function cover(pathname: string, base: string): number {
  if (base === "/") return pathname === "/" ? 1 : -1;
  return pathname === base || pathname.startsWith(`${base}/`) ? base.length : -1;
}

/**
 * The section and item a page belongs to: the item whose path covers the most of it. A section whose pages
 * are not listed (the Dashboard, the Counter) is found by its own path, with no item. A page outside every
 * section (Settings) is `found: false`, with the first section standing in.
 */
export function locate(pathname: string): { section: NavSection; item: NavItem | null; found: boolean } {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  let best: { section: NavSection; item: NavItem | null; score: number } = { section: SECTIONS[0], item: null, score: -1 };
  for (const section of SECTIONS) {
    if (section.groups.length === 0) {
      const score = cover(path, section.to);
      if (score > best.score) best = { section, item: null, score };
    }
    for (const group of section.groups)
      for (const item of group.items) {
        const score = Math.max(...[item.to, ...(item.also ?? [])].map((base) => cover(path, base)));
        if (score > best.score) best = { section, item, score };
      }
  }
  return { section: best.section, item: best.item, found: best.score >= 0 };
}
