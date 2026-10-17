import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { validatePromoCode, computeDiscount, PromoCode } from '../utils/promoCodes';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  img?: string;
  quantity: number;
  selected: boolean;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity' | 'selected'>, quantity?: number) => void;
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

// The cart is saved on the phone per account, so it survives closing the
// app and a different person signing in on the same phone doesn't inherit
// it. (Only signed-in users can add to cart; see utils/cartGuard.ts.)
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

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  // Whose cart is loaded; null while signed out.
  const ownerRef = useRef<string | null>(null);

  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        ownerRef.current = user?.uid ?? null;
        setItems(user ? loadSavedCart(user.uid) : []);
      }),
    [],
  );

  useEffect(() => {
    if (ownerRef.current) saveCart(ownerRef.current, items);
  }, [items]);

  const addItem: CartContextValue['addItem'] = (item, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i,
        );
      }
      // New items start selected — matches the usual "just added, ready to
      // buy" expectation. Existing items keep whatever selection state the
      // user already set (see above), rather than being forced back on.
      return [...prev, { ...item, quantity, selected: true }];
    });
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
        : prev.map((i) => (i.id === id ? { ...i, quantity } : i)),
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
