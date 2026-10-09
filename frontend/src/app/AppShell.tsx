import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { useLogout, useSession } from "../features/auth/session";
import { useInsightSummary } from "../features/insights/api";
import { SalaahkaarPanel } from "../features/salaahkaar/SalaahkaarPanel";
import { Icon } from "./icons";
import { useTranslation } from "../i18n";
import { HOME, TOP_BAR_SECTIONS, locate } from "./navigation";
import type { ShellContext } from "./shell";

/**
 * The merchant app's frame: a top bar with the logo (home: the Dashboard) and the sections (Counter, Shop, Khata) and, beside the
 * page, the navigation of whichever section the page belongs to. Below the `lg` breakpoint that section
 * navigation is a drawer opened from the top bar.
 */
export function AppShell() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { data: insightSummary } = useInsightSummary();
  const openCount = insightSummary?.open_insight_count ?? 0;
  const logout = useLogout();
  const { pathname } = useLocation();
  const { section, item: current } = locate(pathname);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // The drawer is for getting somewhere: arriving closes it.
  useEffect(() => setMenuOpen(false), [pathname]);
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
      <header className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:z-10 print:hidden">
        <div className="flex flex-wrap items-center gap-x-6 px-4 sm:px-6">
          <div className="flex h-16 shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label={t("shell.menu")}
              aria-expanded={menuOpen}
              aria-controls="section-nav"
              onClick={() => setMenuOpen((open) => !open)}
              className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Icon name="menu" />
            </button>
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
                <span className="hidden text-[11px] text-slate-500 xl:block">{t("app.productLine")}</span>
              </span>
            </Link>
          </div>

          {/*
            The sections read as tabs of the header: the current one is filled. From `lg` up they sit on
            the logo's row and never shrink; below it they take a row of their own. Nothing here scrolls:
            every part keeps its natural width and the three sections fit a phone.
          */}
          <nav
            aria-label={t("shell.main")}
            className="order-last flex w-full shrink-0 gap-1 border-t border-slate-100 py-2 lg:order-none lg:w-auto lg:border-t-0 lg:py-0"
          >
            {TOP_BAR_SECTIONS.map((s) => {
              const active = s.id === section.id;
              return (
                <Link
                  key={s.id}
                  to={s.to}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-sm ${
                    active ? "bg-emerald-50 font-semibold text-emerald-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon name={s.icon} className={`h-[18px] w-[18px] ${active ? "text-emerald-600" : "text-slate-400"}`} />
                  {t(s.key)}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex h-16 shrink-0 items-center gap-2 sm:gap-3">
            <Link
              to="/insights"
              aria-label={openCount > 0 ? t("shell.opportunitiesOpen", { count: openCount }) : t("nav.opportunities")}
              aria-current={section.id === "dashboard" && current?.to === "/insights" ? "page" : undefined}
              className="relative rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <Icon name="bell" className="h-5 w-5" />
              {openCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white"
                >
                  {openCount > 9 ? "9+" : openCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              aria-label={t("shell.askSalaahkaar")}
              onClick={() => setAssistantOpen(true)}
              className="flex items-center gap-2 whitespace-nowrap rounded-full bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 sm:px-4"
            >
              <Icon name="sparkle" className="h-4 w-4" />
              {/* On a phone the button is its icon; the name is still what it is called. */}
              <span className="hidden sm:inline">{t("shell.askSalaahkaar")}</span>
            </button>
            <Link
              to="/settings"
              aria-current={pathname === "/settings" ? "page" : undefined}
              className="hidden items-center gap-2.5 rounded-full py-1 pl-1 pr-3 hover:bg-slate-100 md:flex"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-800"
              >
                {session?.merchant.store_name.trim().charAt(0).toUpperCase()}
              </span>
              <div className="leading-tight">
                <div className="max-w-40 truncate text-sm font-medium text-slate-900">{session?.merchant.store_name}</div>
                <div className="max-w-40 truncate text-xs text-slate-500">{session?.user.name}</div>
              </div>
            </Link>
            <button
              type="button"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
              className="whitespace-nowrap rounded-full px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
            >
              {t("shell.logout")}
            </button>
          </div>
        </div>
        {logout.error && (
          <p role="alert" className="border-t border-red-200 bg-red-50 px-6 py-2 text-sm text-red-700">
            {t("shell.logoutFailed", { message: logout.error.message })}
          </p>
        )}
      </header>

      <div className="flex min-w-0 flex-1">
        {menuOpen && <div className="fixed inset-0 z-20 bg-slate-900/30 lg:hidden" onClick={() => setMenuOpen(false)} />}
        <aside
          id="section-nav"
          className={`${
            menuOpen ? "fixed inset-y-0 left-0 z-30 flex shadow-xl" : "hidden"
          } w-56 shrink-0 flex-col gap-6 overflow-y-auto border-r border-slate-200 bg-white px-3 py-5 lg:sticky lg:top-16 lg:z-auto lg:flex lg:h-[calc(100vh-4rem)] lg:self-start lg:shadow-none print:hidden`}
        >
          {section.groups.map((group) => (
            <nav key={group.title} aria-label={t(group.titleKey)}>
              <h2 className="mb-2 px-3 text-xs font-medium text-slate-400">{t(group.titleKey)}</h2>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = item === current;
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                          active ? "bg-emerald-50 font-medium text-emerald-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <Icon name={item.icon} className={`h-[18px] w-[18px] ${active ? "text-emerald-700" : "text-slate-400"}`} />
                        {t(item.key)}
                        {item.soon && (
                          <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                            {t("common.soon")}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ))}
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:px-8">
          <Outlet context={{ openAssistant: () => setAssistantOpen(true) } satisfies ShellContext} />
        </main>
      </div>

      <SalaahkaarPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  );
}
