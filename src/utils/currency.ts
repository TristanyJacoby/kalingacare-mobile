// src/utils/currency.ts
// KalingaCare — country -> currency mapping and live PHP conversion.
// Ported from the web app's js/currency.js so both platforms agree on the
// same country list and conversion behavior.
//
// This is a DISPLAY conversion only: the real order amount stored in
// Firestore is always PHP (Cash on Delivery, priced in PHP, is the only
// real payment path this project has) — converting it is purely so an OFW
// browsing from abroad can see roughly what they're spending in their own
// currency.

// Keyed by country name (stored verbatim on the user doc) so the
// registration/settings picker and this map never drift out of sync.
export const COUNTRY_CURRENCY: Record<string, string> = {
  Philippines: "PHP",
  "Saudi Arabia": "SAR",
  "United Arab Emirates": "AED",
  Qatar: "QAR",
  Kuwait: "KWD",
  Bahrain: "BHD",
  Oman: "OMR",
  "Hong Kong": "HKD",
  Singapore: "SGD",
  Japan: "JPY",
  "South Korea": "KRW",
  Taiwan: "TWD",
  Malaysia: "MYR",
  "United States": "USD",
  Canada: "CAD",
  "United Kingdom": "GBP",
  Australia: "AUD",
  "New Zealand": "NZD",
  Germany: "EUR",
  Italy: "EUR",
  Spain: "EUR",
  "Other / Not Listed": "USD",
};

// Approximate PHP -> currency rates, only used if the live Frankfurter API
// is unreachable, so the conversion feature still visibly works rather
// than silently breaking. Not kept precisely up to date on purpose — this
// is a fallback, not the source of truth; getRates() always tries the
// live API first.
const FALLBACK_RATES: Record<string, number> = {
  PHP: 1,
  SAR: 0.064,
  AED: 0.063,
  QAR: 0.062,
  KWD: 0.0053,
  BHD: 0.0065,
  OMR: 0.0066,
  HKD: 0.134,
  SGD: 0.023,
  JPY: 2.5,
  KRW: 23.5,
  TWD: 0.55,
  MYR: 0.08,
  USD: 0.017,
  CAD: 0.024,
  GBP: 0.013,
  AUD: 0.026,
  NZD: 0.028,
  EUR: 0.016,
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface RatesResult {
  timestamp: number;
  rates: Record<string, number>;
  live: boolean;
  liveCodes: string[];
}

let rateCache: RatesResult | null = null;

// Frankfurter's rates come from the European Central Bank, which simply
// doesn't publish reference rates for every currency in COUNTRY_CURRENCY —
// notably the Gulf currencies (SAR, AED, QAR, KWD, BHD, OMR) and TWD are
// never available from it, live or not. So every currency always gets
// *some* rate (falling back per-currency, not all-or-nothing), and
// `liveCodes` tells the UI which ones are actually live right now.
export async function getRates(): Promise<RatesResult> {
  if (rateCache && Date.now() - rateCache.timestamp < CACHE_TTL_MS) {
    return rateCache;
  }

  const symbols = [...new Set(Object.values(COUNTRY_CURRENCY))]
    .filter((code) => code !== "PHP")
    .join(",");

  try {
    const res = await fetch(
      `https://api.frankfurter.dev/v1/latest?from=PHP&to=${symbols}`,
    );
    if (!res.ok) throw new Error(`Frankfurter API returned ${res.status}`);
    const data = await res.json();
    rateCache = {
      timestamp: Date.now(),
      rates: { PHP: 1, ...FALLBACK_RATES, ...data.rates },
      live: true,
      liveCodes: Object.keys(data.rates || {}),
    };
  } catch (err) {
    console.warn(
      "Currency conversion: live rates unavailable, using fallback table.",
      err,
    );
    rateCache = {
      timestamp: Date.now(),
      rates: { PHP: 1, ...FALLBACK_RATES },
      live: false,
      liveCodes: [],
    };
  }

  return rateCache;
}

// Formats a PHP amount converted into `currencyCode` using Intl's own
// locale-correct currency formatting.
export function formatCurrency(
  amountInTargetCurrency: number,
  currencyCode: string,
): string {
  if (currencyCode === "PHP") {
    return (
      "₱" +
      amountInTargetCurrency.toLocaleString("en-PH", {
        maximumFractionDigits: 2,
      })
    );
  }
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits:
        currencyCode === "JPY" || currencyCode === "KRW" ? 0 : 2,
    }).format(amountInTargetCurrency);
  } catch {
    return `${currencyCode} ${amountInTargetCurrency.toFixed(2)}`;
  }
}

// Converts a PHP amount to `currencyCode` given a rates object from
// getRates(), and formats it in one step.
export function convertAndFormat(
  phpAmount: number,
  currencyCode: string,
  rates: Record<string, number>,
): string {
  const rate = rates[currencyCode] ?? 1;
  return formatCurrency(phpAmount * rate, currencyCode);
}

// Country list ordered so the most common OFW destinations aren't buried
// alphabetically under "Australia".
const PRIORITY_COUNTRIES = [
  "Saudi Arabia",
  "United Arab Emirates",
  "Qatar",
  "Kuwait",
  "Hong Kong",
  "Singapore",
  "United States",
  "Philippines",
];

export function getOrderedCountries(): string[] {
  const countries = Object.keys(COUNTRY_CURRENCY);
  return [
    ...PRIORITY_COUNTRIES,
    ...countries
      .filter((c) => !PRIORITY_COUNTRIES.includes(c))
      .sort((a, b) => a.localeCompare(b)),
  ];
}

const PRIORITY_CURRENCIES = ["PHP", "USD", "SAR", "AED", "QAR", "KWD", "HKD", "SGD"];

// Distinct currency codes (not per country — several countries share a
// currency, e.g. every Eurozone entry above maps to EUR), for the
// checkout "show total in" picker.
export function getOrderedCurrencyCodes(): string[] {
  const codes = [...new Set(Object.values(COUNTRY_CURRENCY))];
  return [
    ...PRIORITY_CURRENCIES,
    ...codes.filter((c) => !PRIORITY_CURRENCIES.includes(c)).sort(),
  ];
}
