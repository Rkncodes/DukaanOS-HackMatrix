import { useRef, useState } from "react";
import { useTranslation } from "../../i18n";
import type { Schemas } from "../../lib/api/client";
import { formatINR, formatQuantity } from "../../lib/format";
import { availableStock, resolveScan, searchProducts } from "./bill";

type Props = {
  products: Schemas["ProductRead"][];
  /** The open bill's lines: each product shows its stock minus what the bill already holds. */
  cartItems: Schemas["CartItemRead"][];
  onAdd: (item: Schemas["CartItemAdd"]) => Promise<unknown>;
  busy: boolean;
};

/** One box for both barcode scanners (which type the code + Enter) and name search. */
export function ProductPicker({ products, cartItems, onAdd, busy }: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = searchProducts(query, products);
  const available = availableStock(products, cartItems);
  /** One more unit of this product no longer fits in what is left. */
  const soldOut = (productId: string) => (available.get(productId) ?? 0) < 1;

  async function add(item: Schemas["CartItemAdd"]) {
    setMessage(null);
    try {
      await onAdd(item);
      setQuery("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t("picker.couldNotAdd"));
    } finally {
      inputRef.current?.focus();
    }
  }

  function onEnter() {
    const action = resolveScan(query, products);
    const product =
      action.kind === "barcode"
        ? products.find((p) => p.barcode === action.barcode)
        : action.kind === "product"
          ? products.find((p) => p.id === action.productId)
          : undefined;
    if (product && soldOut(product.id)) setMessage(t("picker.noMoreInStock", { name: product.name }));
    else if (action.kind === "barcode") void add({ barcode: action.barcode, source: "barcode" });
    else if (action.kind === "product") void add({ product_id: action.productId, source: "manual" });
    else setMessage(action.reason || null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <label htmlFor="counter-scan" className="mb-1.5 block text-sm font-medium text-slate-700">
        {t("picker.label")}
      </label>
      <input
        id="counter-scan"
        ref={inputRef}
        autoFocus
        autoComplete="off"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setMessage(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter();
          } else if (e.key === "Escape") {
            setQuery("");
            setMessage(null);
          }
        }}
        placeholder={t("picker.placeholder")}
        className="w-full rounded-xl border border-transparent bg-slate-100 px-4 py-3 text-base text-slate-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-100"
      />
      <p className="mt-1.5 min-h-5 text-sm text-red-600" role="status">
        {message}
      </p>

      <ul aria-label={t("picker.products")} className="-mx-1 mt-1 grid min-h-0 flex-1 auto-rows-max grid-cols-1 gap-2 overflow-y-auto px-1 pb-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {matches.map((p) => {
          const left = available.get(p.id) ?? 0;
          return (
            <li key={p.id} className="flex">
              <button
                type="button"
                disabled={busy || soldOut(p.id)}
                onClick={() => void add({ product_id: p.id, source: "manual" })}
                className="group flex w-full flex-col gap-1 rounded-2xl bg-slate-50 px-4 py-3.5 text-left hover:bg-lime-100 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-slate-50"
              >
                <span className="order-1 text-sm font-medium leading-snug text-slate-900">{p.name}</span>
                {/* The whole tile adds the product; the plus only says so. */}
                <span className="order-3 mt-auto flex items-center justify-between gap-2 pt-2 text-sm">
                  <span className="font-semibold tabular-nums text-slate-900">
                    {formatINR(p.price)}
                    <span className="font-normal text-slate-400"> / {p.unit}</span>
                  </span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white group-disabled:bg-white group-disabled:text-slate-300">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true" className="h-3.5 w-3.5">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </span>
                <span className={`order-2 whitespace-nowrap text-xs ${left <= 0 ? "font-medium text-red-600" : "text-slate-500"}`}>
                  {t("picker.left", { quantity: formatQuantity(String(left)) })}
                </span>
              </button>
            </li>
          );
        })}
        {matches.length === 0 && <li className="col-span-full py-8 text-center text-sm text-slate-500">{t("picker.noMatch")}</li>}
      </ul>
    </div>
  );
}
