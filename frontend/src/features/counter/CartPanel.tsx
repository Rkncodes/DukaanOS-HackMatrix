import { useState } from "react";
import { Icon } from "../../app/icons";
import { useTranslation, type MessageKey } from "../../i18n";
import type { Schemas } from "../../lib/api/client";
import { formatINR, formatQuantity } from "../../lib/format";
import { billTotals, stockShortfalls } from "./bill";
import { CustomerPicker } from "./CustomerPicker";
import { PaytmPay } from "./paytm/PaytmPay";
import { usePaytm } from "./paytm/usePaytm";
import { useCrossSell, type useCounter } from "./useCounter";

type Counter = ReturnType<typeof useCounter>;
/** How the bill is settled. Paytm is not a checkout method: the backend verifies it with Paytm first. */
type Method = Schemas["CheckoutMethod"] | "paytm";

const METHODS: Method[] = ["cash", "upi", "card", "khata"];

type Props = {
  counter: Counter;
  products: Schemas["ProductRead"][] | undefined;
  onCompleted: (bill: Schemas["BillRead"]) => void;
};

export function CartPanel({ counter, products, onCompleted }: Props) {
  const { t } = useTranslation();
  const { cart, setQuantity, removeItem, setCustomer, checkout } = counter;
  const [enteredDiscount, setDiscount] = useState("");
  const [chosenMethod, setMethod] = useState<Method>("cash");

  function completed(bill: Schemas["BillRead"]) {
    setDiscount("");
    setMethod("cash");
    onCompleted(bill);
  }
  const paytm = usePaytm(cart?.id ?? null, (bill) => {
    counter.billCompleted();
    completed(bill);
  });
  // While a Paytm payment is in flight (or Paytm holds money for this bill) the bill stays as it was charged.
  const locked = paytm.live;
  const method: Method = locked ? "paytm" : chosenMethod;
  const discount = locked && paytm.payment ? paytm.payment.discount : enteredDiscount;
  const methods: Method[] = paytm.enabled ? [...METHODS, "paytm"] : METHODS;

  const items = cart?.items ?? [];
  const crossSell = useCrossSell(cart?.id ?? null, items);
  const totals = billTotals(cart?.subtotal ?? "0.00", discount);
  const shortfalls = stockShortfalls(items, products);
  const stock = new Map(products?.map((p) => [p.id, Number(p.stock_quantity)]));
  const needsCustomer = method === "khata" && !cart?.customer_id;
  const editing = setQuantity.isPending || removeItem.isPending || setCustomer.isPending;
  const canCheckout = items.length > 0 && totals.ok && !needsCustomer && !editing && !checkout.isPending;
  const lineError = setQuantity.error ?? removeItem.error ?? setCustomer.error;

  function submit() {
    if (!canCheckout || !totals.ok || method === "paytm") return;
    checkout.mutate({ method, discount: totals.discount }, { onSuccess: completed });
  }

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white lg:[@media(min-height:700px)]:max-h-[calc(100vh-11.5rem)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="mb-2 text-xs font-medium text-slate-500">{t("cart.customer")}</h2>
        <CustomerPicker
          customerId={cart?.customer_id ?? null}
          onChange={(id) => setCustomer.mutate(id)}
          disabled={setCustomer.isPending || checkout.isPending || locked}
        />
      </div>

      {/* The lines scroll under the heading; the customer above and the totals below stay where they are. */}
      <div className="flex min-h-0 flex-1 flex-col">
        <h2 className="border-b border-slate-100 px-5 pb-3 pt-4 text-sm font-semibold text-slate-900">{t("cart.bill")}</h2>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">{t("cart.empty")}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <CartLine
                key={item.id}
                item={item}
                available={shortfalls.get(item.id)}
                stock={stock.get(item.product_id)}
                disabled={editing || checkout.isPending || locked}
                onQuantity={(quantity) => setQuantity.mutate({ itemId: item.id, quantity })}
                onRemove={() => removeItem.mutate(item.id)}
              />
            ))}
          </ul>
        )}
        {lineError && <p className="mt-2 text-sm text-red-600">{lineError.message}</p>}

        {!!crossSell.data?.length && (
          <div className="mt-3 rounded-xl bg-emerald-50 p-3">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-emerald-800">
              <Icon name="sparkle" className="h-3.5 w-3.5" />
              {t("cart.crossSell")}
            </h3>
            <ul className="flex flex-wrap gap-2">
              {crossSell.data.map((s) => {
                const left = stock.get(s.product_id);
                const soldOut = left !== undefined && left <= 0;
                return (
                  <li key={s.product_id}>
                    <button
                      type="button"
                      disabled={editing || checkout.isPending || locked || soldOut}
                      onClick={() => counter.addItem.mutate({ product_id: s.product_id, source: "manual" })}
                      className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-3 py-1 text-sm text-slate-800 hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {s.name}
                      <span className="text-slate-500">{formatINR(s.price)}</span>
                      <span aria-hidden="true" className="font-semibold text-emerald-700">+</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        </div>
      </div>

      <div className="space-y-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">{t("cart.subtotal")}</dt>
            <dd className="tabular-nums text-slate-900">{formatINR(totals.subtotal)}</dd>
          </div>
          {!!cart?.tax_summary && Number(cart.tax_summary.total_tax) > 0 && (
            <div className="flex justify-between gap-3 text-xs text-slate-500">
              <dt>
                {t("cart.includesGst", { cgst: formatINR(cart.tax_summary.cgst), sgst: formatINR(cart.tax_summary.sgst) })}
              </dt>
              <dd className="tabular-nums">{formatINR(cart.tax_summary.total_tax)}</dd>
            </div>
          )}
          <div className="flex items-center justify-between">
            <dt className="text-slate-500">
              <label htmlFor="counter-discount">{t("cart.discount")}</label>
            </dt>
            <dd>
              <input
                id="counter-discount"
                inputMode="decimal"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                disabled={locked}
                placeholder="0"
                className="h-8 w-24 rounded-lg border border-slate-300 bg-white px-2 text-right text-sm tabular-nums focus:border-emerald-600 focus:outline-none disabled:bg-slate-100"
              />
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-slate-200 pt-3 font-semibold text-slate-900">
            <dt className="text-sm">{t("cart.total")}</dt>
            <dd className="text-2xl tracking-tight tabular-nums">{totals.ok ? formatINR(totals.total) : "–"}</dd>
          </div>
        </dl>
        {!totals.ok && <p className="text-sm text-red-600">{totals.error}</p>}

        <div
          role="radiogroup"
          aria-label={t("cart.paymentMethod")}
          className={`grid gap-2 ${paytm.enabled ? "grid-cols-5" : "grid-cols-4"}`}
        >
          {methods.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={method === m}
              disabled={locked}
              onClick={() => setMethod(m)}
              className={`truncate rounded-lg border px-1 py-2 text-sm font-medium disabled:cursor-not-allowed ${
                method === m
                  ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              {t(`cart.method.${m}` as MessageKey)}
            </button>
          ))}
        </div>
        {needsCustomer && <p className="text-sm text-amber-700">{t("cart.needsCustomer")}</p>}
        {checkout.error && <p className="text-sm text-red-600">{checkout.error.message}</p>}

        {method === "paytm" ? (
          <PaytmPay
            paytm={paytm}
            total={totals.ok ? totals.total : null}
            discount={totals.ok ? totals.discount : "0"}
            ready={canCheckout}
          />
        ) : (
          <button
            type="button"
            disabled={!canCheckout}
            onClick={submit}
            className="w-full rounded-xl bg-emerald-600 py-3 text-base font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {checkout.isPending
              ? t("cart.completing")
              : method === "khata"
                ? t("cart.addToKhata", { amount: totals.ok ? formatINR(totals.total) : "" })
                : t("cart.collect", { amount: totals.ok ? formatINR(totals.total) : "" })}
          </button>
        )}
      </div>
    </section>
  );
}

function CartLine({
  item,
  available,
  stock,
  disabled,
  onQuantity,
  onRemove,
}: {
  item: Schemas["CartItemRead"];
  available: string | undefined;
  /** The product's stock in the catalogue; the line cannot be raised above it. Undefined: not known yet. */
  stock: number | undefined;
  disabled: boolean;
  onQuantity: (quantity: string) => void;
  onRemove: () => void;
}) {
  const { t, label } = useTranslation();
  const quantity = Number(item.quantity);
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft === null) return;
    const next = Number(draft);
    setDraft(null);
    if (!Number.isFinite(next) || next <= 0) return;
    // A typed quantity above the stock becomes the stock. The backend still decides at checkout.
    const capped = stock !== undefined && next > stock ? stock : next;
    if (capped > 0 && capped !== quantity) onQuantity(capped === next ? draft.trim() : String(capped));
  }

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-slate-900" title={item.product_name}>{item.product_name}</div>
          <div className="mt-0.5 text-xs text-slate-500">
            {t("cart.each", { price: formatINR(item.unit_price) })}
            {item.source !== "manual" && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5">{label("source", item.source)}</span>}
          </div>
        </div>
        <div className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{formatINR(item.line_total)}</div>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <button
          type="button"
          aria-label={t("cart.decrease", { name: item.product_name })}
          disabled={disabled}
          onClick={() => (quantity > 1 ? onQuantity(String(quantity - 1)) : onRemove())}
          className="h-8 w-8 rounded-md border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
        >
          −
        </button>
        <input
          aria-label={t("cart.quantityOf", { name: item.product_name })}
          inputMode="decimal"
          disabled={disabled}
          value={draft ?? formatQuantity(item.quantity)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="h-8 w-12 rounded-md border border-slate-200 text-center text-sm tabular-nums focus:border-emerald-600 focus:outline-none"
        />
        <button
          type="button"
          aria-label={t("cart.increase", { name: item.product_name })}
          disabled={disabled || (stock !== undefined && quantity + 1 > stock)}
          onClick={() => onQuantity(String(quantity + 1))}
          className="h-8 w-8 rounded-md border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
        >
          +
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="ml-auto rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
        >
          {t("common.remove")}
        </button>
      </div>
      {available !== undefined && (
        <p className="mt-1.5 text-xs text-amber-700">{t("cart.onlyInStock", { quantity: formatQuantity(available) })}</p>
      )}
    </li>
  );
}
