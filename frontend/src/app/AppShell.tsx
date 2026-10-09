import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { useLogout, useSession } from "../features/auth/session";
import { useInsightSummary } from "../features/insights/api";
import { SalaahkaarPanel } from "../features/salaahkaar/SalaahkaarPanel";
import { Icon } from "./icons";
import { useTranslation } from "../i18n";
import { HOME, TOP_BAR_SECTIONS, locate } from "./navigation";
import type { ShellContext } from "./shell";

/**
 * The merchant app's frame: a top bar with the logo (home: the Dashboard), the sections (Dashboard, Counter,
 * Catalogue, Shop, Khata, Insights) and the store's own menu (Settings, Log out) and, under it, the pages of
 * whichever section the page belongs to. Below the `lg` breakpoint those pages are a drawer opened from the
 * top bar. The Dashboard and the Counter have no pages of their own to list.
 */
export function AppShell() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { data: insightSummary } = useInsightSummary();
  const openCount = insightSummary?.open_insight_count ?? 0;
  const logout = useLogout();
  const { pathname } = useLocation();
  const { section, item: current, found: inSection } = locate(pathname);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const account = useRef<HTMLDivElement>(null);
  const hasPages = inSection && section.groups.length > 0;

  // On the narrowest phones the row of sections scrolls: keep the current one in sight.
  const tabs = useRef<HTMLElement>(null);
  useEffect(() => {
    const tab = tabs.current?.querySelector<HTMLElement>('[aria-current="page"]');
    tab?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [section.id]);

  // The drawer is for getting somewhere: arriving closes it. So does the store's menu.
  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!accountOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!account.current?.contains(e.target as Node)) setAccountOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [accountOpen]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-800">
      <header className="bg-slate-100 lg:sticky lg:top-0 lg:z-10 print:hidden">
        <div className="flex flex-wrap items-center gap-x-6 px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 shrink-0 items-center gap-2">
            {/* A section with pages of its own gets the menu; the Counter switches its inputs inside the page. */}
            {hasPages && (
              <button
                type="button"
                aria-label={t("shell.menu")}
                aria-expanded={menuOpen}
                aria-controls="section-nav"
                onClick={() => setMenuOpen((open) => !open)}
                className="-ml-1 rounded-full bg-white p-2 text-slate-600 hover:text-slate-900 lg:hidden"
              >
                <Icon name="menu" />
              </button>
            )}
            <Link
              to={HOME.to}
              aria-label={t("shell.home")}
              aria-current={section === HOME ? "page" : undefined}
              className="flex items-center gap-2.5 rounded-lg"
            >
              <span className="rounded-xl bg-emerald-600 p-2 text-white">
                <Icon name="store" className="h-5 w-5" />
              </span>
              <span className="leading-tight">
                <span className="block text-base font-semibold tracking-tight text-slate-900">DukaanOS</span>
                <span className="hidden text-[11px] text-slate-500 2xl:block">{t("app.productLine")}</span>
              </span>
            </Link>
          </div>

          {/*
            The sections read as tabs of the header: the current one is filled. From `lg` up they sit on
            the logo's row and never shrink; below it they take a row of their own. The page never scrolls
            sideways for them: where five do not fit (the narrowest phones) the row itself does.
          */}
          <nav
            ref={tabs}
            aria-label={t("shell.main")}
            className="order-last flex w-full min-w-0 shrink-0 gap-0.5 overflow-x-auto pb-2 [scrollbar-width:none] sm:gap-1 lg:order-none lg:w-auto lg:overflow-visible lg:pb-0"
          >
            {TOP_BAR_SECTIONS.map((s) => {
              const active = inSection && s.id === section.id;
              return (
                <Link
                  key={s.id}
                  to={s.to}
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-2.5 py-2 text-sm sm:px-3.5 lg:px-3 xl:px-3.5 ${
                    active ? "bg-lime-300 font-semibold text-emerald-950" : "text-slate-600 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  {/* The icons join the words wherever the row has room for them: not on a phone, nor on a small laptop. */}
                  <Icon name={s.icon} className={`hidden h-[18px] w-[18px] sm:block lg:hidden wide:block ${active ? "text-emerald-900" : "text-slate-400"}`} />
                  {t(s.key)}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex h-16 shrink-0 items-center gap-2 sm:gap-3">
            <Link
              to="/insights"
              aria-label={openCount > 0 ? t("shell.opportunitiesOpen", { count: openCount }) : t("nav.opportunities")}
              aria-current={current?.to === "/insights" ? "page" : undefined}
              className="relative rounded-full bg-white p-2.5 text-slate-700 hover:text-slate-900"
            >
              <Icon name="bell" className="h-5 w-5" />
              {openCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-slate-100"
                >
                  {openCount > 9 ? "9+" : openCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              aria-label={t("shell.askSalaahkaar")}
              onClick={() => setAssistantOpen(true)}
              className="flex items-center gap-2 whitespace-nowrap rounded-full bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 sm:px-5"
            >
              <Icon name="sparkle" className="h-4 w-4 text-lime-300" />
              {/* On a phone the button is its icon; the name is still what it is called. */}
              <span className="hidden sm:inline lg:hidden xl:inline">{t("shell.askSalaahkaar")}</span>
            </button>
            {/* The store's own menu: its settings and the way out. */}
            <div ref={account} className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                aria-controls="account-menu"
                onClick={() => setAccountOpen((open) => !open)}
                className={`flex items-center gap-2.5 rounded-full p-1 text-left hover:bg-white md:pr-3 ${accountOpen ? "bg-white" : ""}`}
              >
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-lime-300"
                >
                  {session?.merchant.store_name.trim().charAt(0).toUpperCase()}
                </span>
                {/* On a phone the button is the store's initial; its name is still what it is called. */}
                <span className="sr-only leading-tight md:not-sr-only">
                  <span className="block max-w-40 truncate text-sm font-medium text-slate-900">{session?.merchant.store_name}</span>
                  <span className="block max-w-40 truncate text-xs text-slate-500">{session?.user.name}</span>
                </span>
              </button>
              {accountOpen && (
                <div id="account-menu" role="menu" className="absolute right-0 top-full z-30 mt-2 w-52 rounded-2xl bg-white p-1.5 shadow-lg">
                  <Link
                    to="/settings"
                    role="menuitem"
                    aria-current={pathname === "/settings" ? "page" : undefined}
                    onClick={() => setAccountOpen(false)}
                    className="block rounded-xl px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  >
                    {t("settings.title")}
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={logout.isPending}
                    onClick={() => logout.mutate()}
                    className="block w-full rounded-xl px-3.5 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                  >
                    {t("shell.logout")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {logout.error && (
          <p role="alert" className="border-t border-red-200 bg-red-50 px-6 py-2 text-sm text-red-700">
            {t("shell.logoutFailed", { message: logout.error.message })}
          </p>
        )}
      </header>

      {/* From `lg` up the section's pages sit in a row under the top bar, so the page itself gets the full width. */}
      <div className="flex min-w-0 flex-1 flex-col">
        {menuOpen && <div className="fixed inset-0 z-20 bg-slate-900/30 lg:hidden" onClick={() => setMenuOpen(false)} />}
        {hasPages && (
        <aside
          id="section-nav"
          className={`${
            menuOpen ? "fixed inset-y-0 left-0 z-30 flex shadow-xl" : "hidden"
          } w-60 shrink-0 flex-col gap-6 overflow-y-auto bg-white px-3 py-5 lg:static lg:z-auto lg:flex lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-5 lg:gap-y-2 lg:overflow-visible lg:bg-transparent lg:px-8 lg:pb-0 lg:pt-1 lg:shadow-none print:hidden`}
        >
          {section.groups.map((group) => (
            <nav key={group.title} aria-label={t(group.titleKey)} className="lg:flex lg:items-center lg:gap-2.5">
              <h2 className="mb-2 px-3 text-xs font-medium text-slate-400 lg:mb-0 lg:px-0 lg:text-slate-500">{t(group.titleKey)}</h2>
              <ul className="flex flex-col gap-0.5 lg:flex-row lg:flex-wrap lg:rounded-3xl lg:bg-white lg:p-1">
                {group.items.map((item) => {
                  const active = item === current;
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-3 whitespace-nowrap rounded-full px-3.5 py-2 text-sm lg:gap-2 lg:py-1.5 ${
                          active ? "bg-emerald-600 font-medium text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <Icon name={item.icon} className={`h-[18px] w-[18px] lg:hidden ${active ? "text-lime-300" : "text-slate-400"}`} />
                        {t(item.key)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </aside>
        )}

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:px-8 lg:pt-5">
          <Outlet context={{ openAssistant: () => setAssistantOpen(true) } satisfies ShellContext} />
        </main>
      </div>

      <SalaahkaarPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  );
}
