import { collection, query, where, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface PromoCode {
  code: string;
  type: 'percent' | 'flat';
  value: number;
  label: string;
  firstOrderOnly?: boolean;
}

// Promo codes are managed on the website (Admin > Promotions) and stored in
// the Firestore collection promos. Until an admin has managed them there, the
// two original codes below keep working (same rule as the website's server).
const DEFAULT_PROMOS: Record<string, PromoCode> = {
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

// Looks the code up the way the server will when the order is placed.
async function findPromo(code: string): Promise<{ promo?: PromoCode; error?: string }> {
  if (!/^[A-Z0-9]{3,20}$/.test(code)) return { error: 'Invalid promo code.' };
  const snap = await getDoc(doc(db, 'promos', code));
  if (snap.exists()) {
    const d = snap.data();
    if (d.active === false) return { error: 'Invalid promo code.' };
    const expires = d.expiresAt?.toMillis ? d.expiresAt.toMillis() : null;
    if (expires && expires < Date.now()) return { error: 'This promo code has expired.' };
    return {
      promo: {
        code,
        type: d.type === 'percent' ? 'percent' : 'flat',
        value: Number(d.value) || 0,
        label: d.label || '',
        firstOrderOnly: d.firstOrderOnly === true,
      },
    };
  }
  const seeded = await getDoc(doc(db, 'settings', 'promos'));
  if (seeded.exists() && seeded.data().seeded === true) return { error: 'Invalid promo code.' };
  const fallback = DEFAULT_PROMOS[code];
  return fallback ? { promo: fallback } : { error: 'Invalid promo code.' };
}

export async function validatePromoCode(
  rawCode: string,
  userId: string | null,
): Promise<{ ok: true; promo: PromoCode } | { ok: false; message: string }> {
  const code = rawCode.trim().toUpperCase();
  const found = await findPromo(code);
  if (!found.promo) {
    return { ok: false, message: found.error || 'Invalid promo code.' };
  }
  const promo = found.promo;

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
