import { useState } from "react";
import { Icon, type IconName } from "../../app/icons";
import { PageHeader, QueryState } from "../../app/ui";
import { useTranslation, type MessageKey } from "../../i18n";
import type { Schemas } from "../../lib/api/client";
import { useProducts } from "../../lib/api/queries";
import { useSession } from "../auth/session";
import { BarcodeScan } from "./barcode/BarcodeScan";
import { CartPanel } from "./CartPanel";
import { ParchiReview } from "./parchi/ParchiReview";
import { ProductPicker } from "./ProductPicker";
import { Receipt } from "./Receipt";
import { useCounter } from "./useCounter";
import { LiveVision } from "./vision/LiveVision";
import { PhotoReview } from "./vision/PhotoReview";
import { VoiceReview } from "./voice/VoiceReview";

/** The ways to add items besides the search box: live camera, a barcode, a photo, a handwritten parchi, or voice. */
export type CounterMode = "photo" | "live" | "parchi" | "voice" | "barcode";

/**
 * The billing modes as the merchant sees them. `name` is what each button is called (and what it has always
 * been called); `how` is the one line of instruction shown while the mode is open.
 */
const MODES: { mode: CounterMode | null; id: string; name: string; label: string; hint: string; icon: IconName; how: string }[] = [
  {
    mode: "live",
    id: "live",
    name: "Vision counter",
    label: "Vision",
    hint: "Live camera",
    icon: "camera",
    how: "Put the products on the counter in front of the camera. Each one it recognises is listed under the picture; you add them to the bill.",
  },
  {
    mode: "barcode",
    id: "barcode",
    name: "Scan barcode",
    label: "By code",
    hint: "Scan a barcode",
    icon: "barcode",
    how: "Scan a product's barcode with the camera or a USB scanner, or type the code. It is added to the bill at its catalogue price.",
  },
  {
    mode: "photo",
    id: "photo",
    name: "Add from photo",
    label: "Photo",
    hint: "From a picture",
    icon: "box",
    how: "Choose a photo of the products. Check what was recognised, then add it to the bill.",
  },
  {
    mode: "parchi",
    id: "parchi",
    name: "Add from Parchi",
    label: "Parchi",
    hint: "Handwritten list",
    icon: "note",
    how: "Choose a photo of a handwritten list. Check each line against your products, then add it to the bill.",
  },
  {
    mode: "voice",
    id: "voice",
    name: "Add by Voice",
    label: "Voice",
    hint: "Say the items",
    icon: "mic",
    how: "Choose your language, tap the microphone and say the items and how many. Check what was heard, then add it to the bill.",
  },
  {
    mode: null,
    id: "manual",
    name: "Manual billing",
    label: "Manual",
    hint: "Search or scan",
    icon: "cart",
    how: "Search by name, scan a barcode into the box, or tap a product to add it to the bill.",
  },
];

/**
 * Counter billing: pick products (scan, search, photo, live camera, parchi or voice) -> cart -> checkout (cash/UPI/card or khata).
 * Stock, payments and khata are all updated by the one backend checkout transaction.
 */
export function CounterPage({
  scanIntervalMs,
  mode,
  onModeChange,
}: {
  scanIntervalMs?: number;
  /** Which input is open, when the navigation decides it (see CounterBilling). Left out, the page keeps it itself. */
  mode?: CounterMode | null;
  onModeChange?: (mode: CounterMode | null) => void;
} = {}) {
  const { t } = useTranslation();
  const products = useProducts();
  const { data: session } = useSession();
  const counter = useCounter();
  const [receipt, setReceipt] = useState<Schemas["BillRead"] | null>(null);
  const [ownMode, setOwnMode] = useState<CounterMode | null>(null);
  const visionMode = mode === undefined ? ownMode : mode;
  const setVisionMode = onModeChange ?? setOwnMode;

  // Both vision entry points end at the same existing cart path.
  const confirmVision = (items: Schemas["ConfirmedItem"][]) =>
    counter.addConfirmed.mutateAsync({ source: "vision", items });
  // A parchi is one more input to the same cart path.
  const confirmParchi = (items: Schemas["ConfirmedItem"][]) =>
    counter.addConfirmed.mutateAsync({ source: "parchi", items });
  // So is voice.
  const confirmVoice = (items: Schemas["ConfirmedItem"][]) =>
    counter.addConfirmed.mutateAsync({ source: "voice", items });

  if (receipt) {
    return (
      <>
        <PageHeader title={t("counter.title")} subtitle={t("counter.billComplete")} />
        <Receipt
          bill={receipt}
          storeName={session?.merchant.store_name}
          storeGstin={session?.merchant.gstin}
          onNext={() => setReceipt(null)}
        />
      </>
    );
  }

  const active = MODES.find((m) => m.mode === visionMode)!;
  // The English texts in MODES are the source; what is shown comes from the chosen language's dictionary.
  const text = (id: string, part: "name" | "label" | "hint" | "how") => t(`counter.mode.${id}.${part}` as MessageKey);

  return (
    <>
      <PageHeader
        quiet
        title={t("counter.title")}
        subtitle={t("counter.subtitle")}
        actions={
          // The ways to add items, as one compact switcher leading the page. Vision leads: it is what the Counter is built around.
          <div role="group" aria-label={t("counter.billingMode")} className="flex max-w-full flex-wrap gap-0.5 rounded-3xl bg-white p-1">
            {MODES.map((m) => {
              const on = m.mode === visionMode;
              // Offered once the products are loaded: every mode adds items from the catalogue.
              if (!products.data) return <div key={m.name} className="h-8 w-20 rounded-full bg-slate-100" />;
              return (
                <button
                  key={m.name}
                  type="button"
                  aria-label={text(m.id, "name")}
                  aria-pressed={on}
                  title={text(m.id, "hint")}
                  onClick={() => setVisionMode(m.mode)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
                    on ? "bg-emerald-600 font-medium text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon name={m.icon} className={`h-4 w-4 ${on ? "text-lime-300" : "text-slate-400"}`} />
                  {text(m.id, "label")}
                </button>
              );
            })}
          </div>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_23rem] xl:grid-cols-[minmax(0,1fr)_25rem] xl:gap-6">
        {/*
          One surface for adding items: whichever input is open. Manual billing fills the screen's height, so
          the product list scrolls inside it and the bill stays beside it.
        */}
        <div
          className={`min-w-0 rounded-3xl bg-white p-4 sm:p-5 ${
            visionMode === null ? "lg:flex lg:h-[calc(100vh-11rem)] lg:min-h-[30rem] lg:flex-col" : "lg:self-start"
          }`}
        >
          <p className="mb-4 flex items-start gap-2 px-1 text-sm text-slate-500">
            <Icon name={active.icon} className="mt-0.5 h-4 w-4 text-slate-400" />
            {text(active.id, "how")}
          </p>

          <QueryState isPending={products.isPending} error={products.error} />
          {products.data && visionMode === "live" && (
            <LiveVision
              cart={counter.cart}
              onConfirm={confirmVision}
              onClose={() => setVisionMode(null)}
              scanIntervalMs={scanIntervalMs}
            />
          )}
          {products.data && visionMode === "barcode" && (
            // One more input to the same cart: a scanned code goes down the existing add-item path.
            <BarcodeScan
              products={products.data}
              cartItems={counter.cart?.items ?? []}
              onAdd={(barcode) => counter.addItem.mutateAsync({ barcode, source: "barcode" })}
              onRefresh={async () => (await products.refetch()).data ?? []}
              onClose={() => setVisionMode(null)}
            />
          )}
          {products.data && visionMode === "photo" && (
            <PhotoReview products={products.data} onConfirm={confirmVision} onClose={() => setVisionMode(null)} />
          )}
          {products.data && visionMode === "parchi" && (
            <ParchiReview products={products.data} onConfirm={confirmParchi} onClose={() => setVisionMode(null)} />
          )}
          {products.data && visionMode === "voice" && (
            <VoiceReview
              products={products.data}
              cart={counter.cart}
              onConfirm={confirmVoice}
              onSetQuantity={(itemId, quantity) => counter.setQuantity.mutateAsync({ itemId, quantity })}
              onRemoveItem={(itemId) => counter.removeItem.mutateAsync(itemId)}
              onClose={() => setVisionMode(null)}
            />
          )}
          {products.data && visionMode === null && (
            <div className="flex min-h-0 flex-1 flex-col">
              <ProductPicker
                products={products.data}
                cartItems={counter.cart?.items ?? []}
                busy={counter.addItem.isPending}
                onAdd={(item) => counter.addItem.mutateAsync(item)}
              />
            </div>
          )}
        </div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <CartPanel counter={counter} products={products.data} onCompleted={setReceipt} />
        </div>
      </div>
    </>
  );
}
