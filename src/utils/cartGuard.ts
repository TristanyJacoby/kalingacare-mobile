import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export type CartAccess = 'ok' | 'guest' | 'staff';

// Who may add to cart, same rules as the website:
// - guests must sign in first (web sends them to the login page too)
// - internal accounts (staff/admin/superadmin) don't place real customer
//   orders, so they can't add to cart either.
// Shared by every add-to-cart entry point (Product Detail, quick-add on
// product cards) so the check can't be bypassed through another screen.
export async function canAddToCart(): Promise<CartAccess> {
  const user = auth.currentUser;
  if (!user) return 'guest';
  const snap = await getDoc(doc(db, 'users', user.uid));
  const role = snap.exists() ? snap.data().role || 'user' : 'user';
  return ['staff', 'admin', 'superadmin'].includes(role) ? 'staff' : 'ok';
}
