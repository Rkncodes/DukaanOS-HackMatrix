import type { ReactNode } from "react";
import { Link } from "react-router";
import { useTranslation } from "../i18n";
import { Icon, type IconName } from "./icons";

/** The shared UI primitives. Pages are built from these, so headings, surfaces and status labels look the same everywhere. */

export function FullPageMessage({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}

export function Card({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  const heading = "text-sm font-semibold text-slate-900";
  return (
    <section className="rounded-3xl bg-white p-5">
      {action ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className={heading}>{title}</h2>}
          {action}
        </div>
      ) : (
        title && <h2 className={`mb-4 ${heading}`}>{title}</h2>
      )}
      {children}
    </section>
  );
}

const TONES = {
  slate: "bg-slate-100 text-slate-600",
  emerald: "bg-emerald-50 text-emerald-800",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-700",
  blue: "bg-sky-50 text-sky-700",
};
export type Tone = keyof typeof TONES;

/** A short status label. The tone carries meaning: emerald = fine/done, amber = needs a look, red = a problem. */
export function Badge({ tone = "slate", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}

/** One number the merchant reads at a glance, with a line of context under it. */
export function Stat({
  label,
  value,
  hint,
  icon,
  tone = "slate",
  emphasis = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: IconName;
  /** Colours the icon, and the number too when it is a warning. */
  tone?: Tone;
  /** The one figure a page leads with: it is set larger and fills the space it is given. */
  emphasis?: boolean;
}) {
  const strong = tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-700" : "text-slate-900";
  return (
    <div className={`relative rounded-3xl bg-white ${emphasis ? "h-full p-6 sm:p-7" : "p-5"}`}>
      <div className="pr-10 text-sm text-slate-500">{label}</div>
      <div className={`font-semibold tracking-tight tabular-nums ${emphasis ? "mt-4 text-5xl" : "mt-2 text-2xl"} ${strong}`}>{value}</div>
      {hint && <div className={`leading-relaxed text-slate-500 ${emphasis ? "mt-3 text-sm" : "mt-1 text-xs"}`}>{hint}</div>}
      {icon && (
        <span className={`absolute rounded-full ${emphasis ? "right-6 top-6 p-2.5" : "right-4 top-4 p-2"} ${TONES[tone]}`}>
          <Icon name={icon} className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}

/**
 * A page for something DukaanOS does not do yet. It says so, points at what already works, and offers no
 * control that would look like the feature.
 */
export function ComingSoon({
  title,
  children,
  available = [],
}: {
  title: string;
  children: ReactNode;
  /** Pages that work today and cover a nearby need. */
  available?: { to: string; label: string }[];
}) {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={title} />
      <section className="max-w-xl rounded-3xl bg-white p-6">
        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">{t("common.comingSoon")}</span>
        <div className="mt-4 space-y-2 text-sm leading-relaxed text-slate-600">{children}</div>
        {available.length > 0 && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <h2 className="mb-2 text-sm font-medium text-slate-500">{t("common.availableToday")}</h2>
            <ul className="flex flex-wrap gap-2">
              {available.map((page) => (
                <li key={page.to}>
                  <Link to={page.to} className="inline-block rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50">
                    {page.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </>
  );
}

export function QueryState({ isPending, error }: { isPending: boolean; error: Error | null }) {
  const { t, problem } = useTranslation();
  if (isPending) return <p className="text-sm text-slate-500">{t("common.loading")}</p>;
  if (error) return <p className="text-sm text-red-600">{problem(error)}</p>;
  return null;
}
