import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { validatePromoCode, computeDiscount, PromoCode } from '../utils/promoCodes';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  img?: string;
  quantity: number;
  selected: boolean;
  /** Units left on the product (phone only, not synced). Missing = not limited/unknown. */
  stock?: number;
}

interface CartContextValue {
  items: CartItem[];
  /** Adds up to `quantity` without going past stock; returns how many were added. */
  addItem: (item: Omit<CartItem, 'quantity' | 'selected'>, quantity?: number) => number;
  removeItem: (id: string) => void;
  removeItems: (ids: string[]) => void;
  updateQuantity: (id: string, quantity: number) => void;
  toggleSelected: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  clearCart: () => void;
  totalItems: number;
  /** Number of different products in the cart (what the cart badges show). */
  productCount: number;
  subtotal: number;
  selectedItems: CartItem[];
  selectedCount: number;
  selectedSubtotal: number;
  appliedPromo: PromoCode | null;
  discountAmount: number;
  applyPromoCode: (code: string) => Promise<{ ok: boolean; message: string }>;
  clearPromo: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

// The cart belongs to the account: it's saved on users/{uid}.cart in
// Firestore, shared with the website, as { id, name, price, qty } (web's
// "qty"; no photos, those are large and live on the product). A copy is
// kept on the phone per account so the cart shows instantly and survives
// closing the app. (Only signed-in users can add to cart; cartGuard.ts.)
const cartKey = (uid: string) => `kalingacare_cart_${uid}`;

function loadSavedCart(uid: string): CartItem[] {
  try {
    const saved = JSON.parse(localStorage.getItem(cartKey(uid)) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveCart(uid: string, items: CartItem[]) {
  try {
    localStorage.setItem(cartKey(uid), JSON.stringify(items));
  } catch {
    // Storage full (product photos can be large): keep the cart without
    // photos rather than not at all. The Cart screen shows a placeholder.
    try {
      localStorage.setItem(cartKey(uid), JSON.stringify(items.map((i) => ({ ...i, img: undefined }))));
    } catch {
      // Give up quietly; the cart still works until the app closes.
    }
  }
}

interface SyncedItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

function toSynced(items: CartItem[]): SyncedItem[] {
  return items.map((i) => ({
    id: i.id,
    name: i.name || '',
    price: Number(i.price) || 0,
    qty: Math.max(1, Number(i.quantity) || 1),
  }));
}

// Account cart → phone cart, keeping photos and checkbox state we have.
function fromSynced(remote: SyncedItem[], current: CartItem[]): CartItem[] {
  return remote.map((r) => {
    const known = current.find((c) => c.id === r.id);
    return {
      id: r.id,
      name: r.name,
      price: Number(r.price) || 0,
      quantity: Math.max(1, Number(r.qty) || 1),
      img: known?.img,
      stock: known?.stock,
      selected: known ? known.selected : true,
    };
  });
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  // Whose cart is loaded; null while signed out.
  const ownerRef = useRef<string | null>(null);
  const itemsRef = useRef<CartItem[]>([]);
  itemsRef.current = items;
  // What the account holds as far as we know (JSON of the synced shape),
  // so applying it doesn't write it straight back.
  const lastSyncedRef = useRef('[]');
  const pendingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Looks up each product's current stock, plus photos for items that came
  // from the account (or the website), and lowers quantities above stock.
  const fillPhotos = async (list: CartItem[]) => {
    const photos: Record<string, string> = {};
    const stocks: Record<string, number> = {};
    await Promise.all(
      list.map(async (i) => {
        try {
          const snap = await getDoc(doc(db, 'products', i.id));
          const data = snap.exists() ? snap.data() : null;
          if (!data) {
            stocks[i.id] = 0;
            return;
          }
          if (!i.img && (data.imgBase64 || data.img)) photos[i.id] = data.imgBase64 || data.img;
          if (typeof data.stock === 'number') stocks[i.id] = Math.max(0, data.stock);
        } catch {
          // No photo or stock: placeholder image, quantity not limited here.
        }
      }),
    );
    setItems((prev) =>
      prev.map((i) => {
        const stock = i.id in stocks ? stocks[i.id] : i.stock;
        const quantity = stock !== undefined && stock >= 1 ? Math.min(i.quantity, stock) : i.quantity;
        return { ...i, img: i.img || photos[i.id], stock, quantity };
      }),
    );
  };

  useEffect(() => {
    let unsubCart: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubCart?.();
      unsubCart = null;
      clearTimeout(timerRef.current);
      pendingRef.current = false;
      ownerRef.current = user?.uid ?? null;
      if (!user) {
        lastSyncedRef.current = '[]';
        setItems([]);
        return;
      }
      const cached = loadSavedCart(user.uid);
      // Until the account answers, treat the cached copy as already synced.
      lastSyncedRef.current = JSON.stringify(toSynced(cached));
      setItems(cached);
      let first = true;
      unsubCart = onSnapshot(
        doc(db, 'users', user.uid),
        (snap) => {
          const remote = snap.exists() ? snap.data().cart : undefined;
          if (!Array.isArray(remote)) {
            // First time this account uses the shared cart: upload ours.
            if (first && itemsRef.current.length) {
              lastSyncedRef.current = '[]';
              setItems((prev) => [...prev]);
            }
            first = false;
            return;
          }
          first = false;
          if (pendingRef.current) return;
          const remoteJson = JSON.stringify(toSynced(fromSynced(remote, [])));
          lastSyncedRef.current = remoteJson;
          if (remoteJson !== JSON.stringify(toSynced(itemsRef.current))) {
            const next = fromSynced(remote, itemsRef.current);
            setItems(next);
            fillPhotos(next);
          }
        },
        (err) => console.warn("Couldn't load the cart from your account:", err),
      );
      fillPhotos(cached);
    });
    return () => {
      unsubAuth();
      unsubCart?.();
      clearTimeout(timerRef.current);
    };
  }, []);

  // Save on the phone, and to the account when the cart really changed.
  useEffect(() => {
    const uid = ownerRef.current;
    if (!uid) return;
    saveCart(uid, items);
    const json = JSON.stringify(toSynced(items));
    if (json === lastSyncedRef.current) return;
    pendingRef.current = true;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      updateDoc(doc(db, 'users', uid), { cart: JSON.parse(json) })
        .then(() => {
          lastSyncedRef.current = json;
        })
        .catch((err) => console.warn("Couldn't save the cart to your account:", err))
        .finally(() => {
          pendingRef.current = false;
        });
    }, 300);
  }, [items]);

  const addItem: CartContextValue['addItem'] = (item, quantity = 1) => {
    const inCart = itemsRef.current.find((i) => i.id === item.id)?.quantity ?? 0;
    const limit = typeof item.stock === 'number' ? Math.max(0, item.stock) : Infinity;
    const added = Math.max(0, Math.min(quantity, limit - inCart));
    if (added === 0) return 0;
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, stock: item.stock ?? i.stock, quantity: i.quantity + added } : i,
        );
      }
      // New items start selected — matches the usual "just added, ready to
      // buy" expectation. Existing items keep whatever selection state the
      // user already set (see above), rather than being forced back on.
      return [...prev, { ...item, quantity: added, selected: true }];
    });
    return added;
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const removeItems = (ids: string[]) => {
    setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.id !== id)
        : prev.map((i) =>
            i.id === id ? { ...i, quantity: i.stock !== undefined && i.stock >= 1 ? Math.min(quantity, i.stock) : quantity } : i,
          ),
    );
  };

  const toggleSelected = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)));
  };

  const selectAll = () => setItems((prev) => prev.map((i) => ({ ...i, selected: true })));
  const deselectAll = () => setItems((prev) => prev.map((i) => ({ ...i, selected: false })));

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  // Badges count products, not units: 5 rollators + 1 gown = 2, same as web.
  const productCount = items.length;
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const selectedItems = items.filter((i) => i.selected);
  const selectedCount = selectedItems.reduce((sum, i) => sum + i.quantity, 0);
  const selectedSubtotal = selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);

  const applyPromoCode = async (code: string) => {
    const result = await validatePromoCode(code, auth.currentUser?.uid ?? null);
    if (result.ok) {
      setAppliedPromo(result.promo);
      return { ok: true, message: `Applied: ${result.promo.label}` };
    }
    return { ok: false, message: result.message };
  };

  const clearPromo = () => setAppliedPromo(null);

  const discountAmount = computeDiscount(appliedPromo, selectedSubtotal);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        removeItems,
        updateQuantity,
        toggleSelected,
        selectAll,
        deselectAll,
        clearCart,
        totalItems,
        productCount,
        subtotal,
        selectedItems,
        selectedCount,
        selectedSubtotal,
        appliedPromo,
        discountAmount,
        applyPromoCode,
        clearPromo,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
