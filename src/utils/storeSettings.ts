// The store's platform settings (Admin > Settings on the website), the
// public Firestore doc settings/store: shipping fee, free-shipping rule and
// which payment options are on. The website's server applies them to every
// order; the app reads them to show the same numbers.

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface StoreSettings {
  shippingFee: number;
  freeShippingOver: number; // 0 = shipping is never free
  codEnabled: boolean;
  onlineEnabled: boolean;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  shippingFee: 150,
  freeShippingOver: 0,
  codEnabled: true,
  onlineEnabled: true,
};

let cached: Promise<StoreSettings> | null = null;

export function getStoreSettings(): Promise<StoreSettings> {
  if (!cached) {
    cached = getDoc(doc(db, 'settings', 'store'))
      .then((snap) => {
        const s = snap.exists() ? snap.data() : {};
        const fee = Number(s.shippingFee);
        const free = Number(s.freeShippingOver);
        const out: StoreSettings = {
          shippingFee: Number.isFinite(fee) && fee >= 0 ? fee : DEFAULT_STORE_SETTINGS.shippingFee,
          freeShippingOver: Number.isFinite(free) && free > 0 ? free : 0,
          codEnabled: s.codEnabled !== false,
          onlineEnabled: s.onlineEnabled !== false,
        };
        if (!out.codEnabled && !out.onlineEnabled) out.codEnabled = true;
        return out;
      })
      .catch(() => {
        cached = null; // try again next time
        return DEFAULT_STORE_SETTINGS;
      });
  }
  return cached;
}

// Shipping for items adding up to `subtotal` (before any promo).
export function shippingFor(subtotal: number, s: StoreSettings): number {
  return s.freeShippingOver > 0 && subtotal >= s.freeShippingOver ? 0 : s.shippingFee;
}
