/**
 * Precios y períodos de los planes (D084). Puro: sin React ni Next, para probarlo con
 * `bun test` y portarlo tal cual a Android/iOS. El precio siempre llega de `plans`
 * (`price_cents`, `currency`, `billing_interval`), nunca escrito en el cliente.
 */

export type BillingInterval = "month" | "year";

/** `month`/`year` de la base; cualquier otro valor se trata como mensual (el CHECK lo impide). */
export function billingInterval(value: string): BillingInterval {
  return value === "year" ? "year" : "month";
}

/**
 * Copy de cada período: "al mes" junto al precio de la card, "/ mes" en el resumen y la
 * condición de renovación (CONTENT_CHECKLIST fila 47).
 */
export const INTERVAL_COPY: Record<
  BillingInterval,
  { per: string; unit: string; renewal: string }
> = {
  month: { per: "al mes", unit: "mes", renewal: "Renovación mensual" },
  year: { per: "al año", unit: "año", renewal: "Renovación anual" },
};

const formatters = new Map<string, Intl.NumberFormat>();

function formatterFor(currency: string): Intl.NumberFormat {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("es-419", {
      style: "currency",
      currency,
      // US$20 y no US$20.00; con centavos, los dos decimales (US$19.99).
      trailingZeroDisplay: "stripIfInteger",
    });
    formatters.set(currency, formatter);
  }
  return formatter;
}

/**
 * `2000, "USD"` → `"US$20"`. Números con `Intl` en es-419 (agrupación y decimales); el
 * símbolo de USD es `US$` pegado a la cifra, como en el diseño (es-419 escribiría `USD 20`).
 * Otras monedas conservan lo que da `Intl`.
 */
export function formatPrice(cents: number, currency = "USD"): string {
  const code = currency.toUpperCase();
  const parts = formatterFor(code).formatToParts(cents / 100);
  if (code !== "USD") return parts.map((p) => p.value).join("");
  let out = "US$";
  let afterCurrency = false;
  for (const part of parts) {
    if (part.type === "currency") {
      afterCurrency = true;
      continue;
    }
    // El espacio (duro) que es-419 pone entre el código y la cifra.
    if (afterCurrency && part.type === "literal") continue;
    afterCurrency = false;
    out += part.value;
  }
  return out;
}

/** "US$20 / mes" (resumen del checkout). */
export function formatPricePer(
  cents: number,
  currency: string,
  interval: BillingInterval,
): string {
  return `${formatPrice(cents, currency)} / ${INTERVAL_COPY[interval].unit}`;
}
