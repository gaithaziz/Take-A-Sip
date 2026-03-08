import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

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
  addItem: (item: Omit<CartItem, 'id'>) => void;
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

export const CartProvider = ({ children }: PropsWithChildren) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (newItem: Omit<CartItem, 'id'>) => {
    const id = `${newItem.size.id}:${newItem.addons.map((a) => a.id).sort().join(',')}`;
    setItems((prev) => {
      const existing = prev.find((item) => item.id === id);
      if (existing) {
        return prev.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + newItem.quantity } : item,
        );
      }
      return [...prev, { ...newItem, id }];
    });
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((item) => item.id !== id));

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantity } : item)));
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
