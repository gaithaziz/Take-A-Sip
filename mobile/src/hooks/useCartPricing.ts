import { useEffect, useMemo, useState } from 'react';

import { promotionService } from '@/services/promotionService';
import { useAuth } from '@/state/AuthContext';
import { CartItem } from '@/state/CartContext';
import { Promotion } from '@/types/api';
import { toNumber } from '@/utils/format';

type CartPricing = {
  discount: number;
  total: number;
  freeDelivery: boolean;
  loading: boolean;
  appliedPromotion: Promotion | null;
  freeDeliveryPromotion: Promotion | null;
};

export const useCartPricing = (items: CartItem[], subtotal: number, orderType?: 'pickup' | 'delivery'): CartPricing => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [appliedPromotion, setAppliedPromotion] = useState<Promotion | null>(null);
  const [freeDeliveryPromotion, setFreeDeliveryPromotion] = useState<Promotion | null>(null);
  const [freeDelivery, setFreeDelivery] = useState(false);
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    const run = async () => {
      if (!user || subtotal <= 0 || items.length === 0) {
        setAppliedPromotion(null);
        setFreeDeliveryPromotion(null);
        setFreeDelivery(false);
        setDiscount(0);
        return;
      }
      try {
        setLoading(true);
        const payload = {
          items: items.map((item) => ({
            size_id: item.size.id,
            quantity: item.quantity,
            addon_ids: item.addons.map((addon) => addon.id),
          })),
          ...(orderType ? { order_type: orderType } : {}),
        };
        const evaluation = await promotionService.evaluateCart(payload);
        setAppliedPromotion(evaluation.applied_promotion ?? null);
        setFreeDeliveryPromotion(evaluation.free_delivery_promotion ?? null);
        setFreeDelivery(Boolean(evaluation.free_delivery));
        setDiscount(Math.min(subtotal, Math.max(0, toNumber(evaluation.discount))));
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [items, orderType, subtotal, user]);

  const total = useMemo(() => subtotal - discount, [discount, subtotal]);

  return {
    discount,
    total,
    freeDelivery,
    loading,
    appliedPromotion,
    freeDeliveryPromotion,
  };
};
