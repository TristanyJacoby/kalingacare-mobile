import { createContext, useContext, useState, ReactNode } from 'react';
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

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

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
