import { useEffect, useMemo, useState } from 'react';

import { promotionService } from '@/services/promotionService';
import { useAuth } from '@/state/AuthContext';
import { CartItem } from '@/state/CartContext';
import { Promotion } from '@/types/api';
import { toNumber } from '@/utils/format';

type CartPricing = {
  discount: number;
  total: number;
  loading: boolean;
  appliedPromotion: Promotion | null;
};

export const useCartPricing = (items: CartItem[], subtotal: number): CartPricing => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [appliedPromotion, setAppliedPromotion] = useState<Promotion | null>(null);
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    const run = async () => {
      if (!user || subtotal <= 0 || items.length === 0) {
        setAppliedPromotion(null);
        setDiscount(0);
        return;
      }
      try {
        setLoading(true);
        const evaluation = await promotionService.evaluateCart({
          items: items.map((item) => ({
            size_id: item.size.id,
            quantity: item.quantity,
            addon_ids: item.addons.map((addon) => addon.id),
          })),
        });
        setAppliedPromotion(evaluation.applied_promotion ?? null);
        setDiscount(Math.min(subtotal, Math.max(0, toNumber(evaluation.discount))));
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [items, subtotal, user]);

  const total = useMemo(() => subtotal - discount, [discount, subtotal]);

  return {
    discount,
    total,
    loading,
    appliedPromotion,
  };
};
