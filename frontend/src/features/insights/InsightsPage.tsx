import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Icon, type IconName } from "../../app/icons";
import { Badge, Card, PageHeader, QueryState, type Tone } from "../../app/ui";
import { useTranslation } from "../../i18n";
import type { Schemas } from "../../lib/api/client";
import { useActOnInsight, useInsights } from "./api";
import { insightText } from "./text";

type Insight = Schemas["InsightRead"];

const KIND_ICON: Record<Insight["kind"], IconName> = {
  stockout_risk: "stack",
  dead_stock: "box",
  customer_winback: "clock",
  khata_risk: "book",
};
const KINDS = Object.keys(KIND_ICON) as Insight["kind"][];

/**
 * Every open, actionable thing the store's own data points to right now: products about to run out,
 * products that have stopped selling, customers overdue for a visit, and khata that has gone stale.
 * Nothing here is estimated or invented; each item names the record it came from and where to act on it.
 */
export function InsightsPage() {
  const { t, language } = useTranslation();
  const insights = useInsights();
  const act = useActOnInsight();
  const [filter, setFilter] = useState<Insight["kind"] | "all">("all");

  const all = insights.data ?? [];
  const shown = filter === "all" ? all : all.filter((i) => i.kind === filter);

  function snooze3Days(key: string) {
    const until = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
    act.mutate({ key, status: "snoozed", snoozed_until: until });
  }

  return (
    <>
      <PageHeader title={t("nav.opportunities")} subtitle={t("insights.subtitle")} />

      <div className="mb-4 flex flex-wrap gap-2">
        <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
          {t("insights.all", { count: all.length })}
        </FilterButton>
        {KINDS.map((kind) => {
          const count = all.filter((i) => i.kind === kind).length;
          if (count === 0) return null;
          return (
            <FilterButton key={kind} active={filter === kind} onClick={() => setFilter(kind)}>
              {t(`insights.kind.${kind}` as const)} ({count})
            </FilterButton>
          );
        })}
      </div>

      <Card>
        <QueryState isPending={insights.isPending} error={insights.error} />
        {insights.data && shown.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">
            {all.length === 0 ? t("dash.nothing") : t("insights.noneOfKind")}
          </p>
        )}
        {shown.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {shown.map((i) => {
              const text = insightText(i, t, language);
              return (
                <li key={i.key} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3.5">
                  <span className={`rounded-full p-2.5 ${i.tone === "red" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>
                    <Icon name={KIND_ICON[i.kind]} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link to={i.link} className="block text-sm font-medium text-slate-900 hover:text-emerald-700 hover:underline">
                      {text.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">{text.detail}</p>
                  </div>
                  {/* What kind of opportunity it is sits beside what can be done about it. */}
                  <div className="flex max-w-full flex-wrap items-center gap-1 lg:shrink-0">
                    <span className="mr-2">
                      <Badge tone={i.tone as Tone}>{t(`insights.kind.${i.kind}` as const)}</Badge>
                    </span>
                    <ActionButton onClick={() => snooze3Days(i.key)}>{t("insights.snooze")}</ActionButton>
                    <ActionButton onClick={() => act.mutate({ key: i.key, status: "dismissed" })}>{t("common.dismiss")}</ActionButton>
                    <ActionButton primary onClick={() => act.mutate({ key: i.key, status: "resolved" })}>
                      {t("insights.handled")}
                    </ActionButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-2 text-xs font-medium ${active ? "bg-emerald-600 text-white" : "bg-white text-slate-600 hover:text-slate-900"}`}
    >
      {children}
    </button>
  );
}

function ActionButton({ onClick, primary, children }: { onClick: () => void; primary?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        primary
          ? "ml-1 whitespace-nowrap rounded-full bg-lime-300 px-3.5 py-1.5 text-xs font-semibold text-emerald-950 hover:bg-lime-400"
          : "whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }
    >
      {children}
    </button>
  );
}
