import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/state/AuthContext';
import { Addon, Item, ItemType, Size } from '@/types/api';
import { toNumber } from '@/utils/format';

export type CartItem = {
  id: string;
  item: Item;
  itemType: ItemType;
  size: Size;
  addons: Addon[];
  quantity: number;
  notes?: string;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => boolean;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  discount: number;
  total: number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const computeLineTotal = (item: CartItem): number => {
  const addons = item.addons.reduce((sum, addon) => sum + toNumber(addon.price), 0);
  return (toNumber(item.size.price) + addons) * item.quantity;
};

const getOrderLimit = (item: Pick<CartItem, 'size'>) => item.size.order_limit ?? null;

const clampToOrderLimit = (items: CartItem[], targetId: string, nextQuantity: number) => {
  const target = items.find((item) => item.id === targetId);
  const orderLimit = target ? getOrderLimit(target) : null;
  if (!target || orderLimit == null) {
    return nextQuantity;
  }
  const otherQuantityForSize = items
    .filter((item) => item.id !== targetId && item.size.id === target.size.id)
    .reduce((sum, item) => sum + item.quantity, 0);
  return Math.max(0, Math.min(nextQuantity, orderLimit - otherQuantityForSize));
};

export const CartProvider = ({ children }: PropsWithChildren) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const nextUserId = user?.id ?? null;
    if (previousUserIdRef.current !== null && previousUserIdRef.current !== nextUserId) {
      setItems([]);
    }
    previousUserIdRef.current = nextUserId;
  }, [user?.id]);

  const addItem = (newItem: Omit<CartItem, 'id'>) => {
    const id = `${newItem.size.id}:${newItem.addons.map((a) => a.id).sort().join(',')}`;
    let added = false;
    setItems((prev) => {
      const existing = prev.find((item) => item.id === id);
      const draft = existing ? prev : [...prev, { ...newItem, id, quantity: 0 }];
      const currentQuantity = existing?.quantity ?? 0;
      const nextQuantity = clampToOrderLimit(draft, id, currentQuantity + newItem.quantity);
      added = nextQuantity > currentQuantity;
      if (existing) {
        return prev.map((item) =>
          item.id === id ? { ...item, quantity: nextQuantity } : item,
        );
      }
      return nextQuantity > 0 ? [...prev, { ...newItem, id, quantity: nextQuantity }] : prev;
    });
    return added;
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((item) => item.id !== id));

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, quantity: clampToOrderLimit(prev, id, quantity) } : item))
        .filter((item) => item.quantity > 0),
    );
  };

  const clearCart = () => setItems([]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + computeLineTotal(item), 0), [items]);
  const discount = 0;
  const total = subtotal - discount;

  const value = useMemo(
    () => ({ items, addItem, removeItem, updateQuantity, clearCart, subtotal, discount, total }),
    [items, subtotal, total],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return context;
};
