import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "../../i18n";
import { api, unwrap, type Schemas } from "../../lib/api/client";
import { useCustomers, useKhataBalances } from "../../lib/api/queries";
import { formatINR } from "../../lib/format";

type Props = {
  customerId: string | null;
  onChange: (customerId: string | null) => void;
  disabled: boolean;
};

/** Attach a customer to the bill: required for khata, optional (but linked) for paid sales. */
export function CustomerPicker({ customerId, onChange, disabled }: Props) {
  const { t } = useTranslation();
  const customers = useCustomers();
  const balances = useKhataBalances();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const create = useMutation({
    mutationFn: (body: Schemas["CustomerCreate"]) => unwrap(api.POST("/api/v1/customers", { body })),
    onSuccess: (customer) => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["khata"] });
      onChange(customer.id);
      setQuery("");
      setOpen(false);
    },
  });

  const balanceOf = (id: string) => balances.data?.find((b) => b.customer_id === id)?.balance;
  const selected = customers.data?.find((c) => c.id === customerId);

  if (selected) {
    const balance = balanceOf(selected.id);
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm">
        <div className="min-w-0">
          <div className="truncate font-medium text-slate-900">{selected.name}</div>
          <div className="text-xs text-slate-600">
            {selected.phone ?? t("customer.noPhone")}
            {balance !== undefined && Number(balance) !== 0 && (
              <span className={Number(balance) > 0 ? "text-red-600" : ""}> · {t("customer.khata", { amount: formatINR(balance) })}</span>
            )}
          </div>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(null)}
          className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-50"
        >
          {t("common.remove")}
        </button>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const matches = (customers.data ?? [])
    .filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone?.includes(q))
    .slice(0, 6);
  const looksLikePhone = /^\d{10}$/.test(query.trim());

  return (
    <div className="relative">
      <input
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={t("customer.placeholder")}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-50"
      />
      {open && (
        <ul className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm shadow-lg">
          {matches.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(c.id);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full justify-between gap-3 px-3.5 py-2 text-left hover:bg-slate-50"
              >
                <span>
                  {c.name} <span className="text-slate-400">{c.phone}</span>
                </span>
                {Number(balanceOf(c.id) ?? 0) > 0 && (
                  <span className="text-red-600">{formatINR(balanceOf(c.id)!)}</span>
                )}
              </button>
            </li>
          ))}
          {q && (
            <li>
              <button
                type="button"
                disabled={create.isPending}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() =>
                  create.mutate(looksLikePhone ? { name: query.trim(), phone: query.trim() } : { name: query.trim() })
                }
                className="w-full border-t border-slate-100 px-3.5 py-2 text-left font-medium text-emerald-700 hover:bg-emerald-50"
              >
                {t("customer.addNew", { name: query.trim() })}
              </button>
            </li>
          )}
        </ul>
      )}
      {create.error && <p className="mt-1 text-sm text-red-600">{create.error.message}</p>}
    </div>
  );
}
