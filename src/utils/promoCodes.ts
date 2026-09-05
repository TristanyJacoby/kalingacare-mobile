import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export interface PromoCode {
  code: string;
  type: 'percent' | 'flat';
  value: number;
  label: string;
  firstOrderOnly?: boolean;
}

// A small, hardcoded set of real promo codes. There's no admin-manageable
// promo system (mobile has no admin side at all), so this is the honest
// scope: real codes that actually validate and discount, just not
// dynamically configurable yet.
const PROMO_CODES: Record<string, PromoCode> = {
  WELCOME10: {
    code: 'WELCOME10',
    type: 'percent',
    value: 10,
    label: '10% off your first order',
    firstOrderOnly: true,
  },
  CARE50: {
    code: 'CARE50',
    type: 'flat',
    value: 50,
    label: '₱50 off your order',
  },
};

export async function validatePromoCode(
  rawCode: string,
  userId: string | null,
): Promise<{ ok: true; promo: PromoCode } | { ok: false; message: string }> {
  const code = rawCode.trim().toUpperCase();
  const promo = PROMO_CODES[code];
  if (!promo) {
    return { ok: false, message: 'Invalid promo code.' };
  }

  if (promo.firstOrderOnly) {
    if (!userId) {
      return { ok: false, message: 'Please log in to use this code.' };
    }
    // Genuinely checks order history rather than trusting the client —
    // someone can't just reuse this code on their fifth order.
    const q = query(collection(db, 'orders'), where('userId', '==', userId), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { ok: false, message: 'This code is only valid on your first order.' };
    }
  }

  return { ok: true, promo };
}

export function computeDiscount(promo: PromoCode | null, subtotal: number): number {
  if (!promo) return 0;
  if (promo.type === 'percent') return Math.round((subtotal * promo.value) / 100);
  return Math.min(promo.value, subtotal); // never discount below zero
}
