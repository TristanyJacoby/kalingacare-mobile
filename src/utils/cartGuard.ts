import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

// Mirrors js/checkout.js's cart-blocking rule — internal accounts
// (staff/admin/superadmin) don't place real customer orders, so they
// shouldn't be able to add to cart either. Shared across every place that
// can add to cart (Product Detail, quick-add buttons on product cards) so
// the check can't be bypassed by using a different entry point.
export async function canAddToCart(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) return true; // not logged in — Firestore rules / checkout will gate this later
  const snap = await getDoc(doc(db, 'users', user.uid));
  const role = snap.exists() ? snap.data().role || 'user' : 'user';
  return !['staff', 'admin', 'superadmin'].includes(role);
}
