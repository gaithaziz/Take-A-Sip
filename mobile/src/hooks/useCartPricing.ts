import { useEffect, useMemo, useState } from 'react';

import { orderService } from '@/services/orderService';
import { promotionService } from '@/services/promotionService';
import { useAuth } from '@/state/AuthContext';
import { Promotion } from '@/types/api';
import { toNumber } from '@/utils/format';

type CartPricing = {
  discount: number;
  total: number;
  loading: boolean;
  appliedPromotion: Promotion | null;
};

const pickBestPromotion = (promotions: Promotion[]): Promotion | null => {
  if (promotions.length === 0) {
    return null;
  }
  return promotions.reduce((best, current) => (toNumber(current.value) > toNumber(best.value) ? current : best));
};

export const useCartPricing = (subtotal: number): CartPricing => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [appliedPromotion, setAppliedPromotion] = useState<Promotion | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!user || subtotal <= 0) {
        setAppliedPromotion(null);
        return;
      }
      try {
        setLoading(true);
        const [promotionsData, ordersData] = await Promise.all([
          promotionService.getActive(),
          orderService.getMyOrders(),
        ]);
        const hasPriorOrder = ordersData.orders.some((order) => order.status !== 'CANCELLED');
        const eligible = promotionsData.promotions.filter((promotion) => {
          if (!promotion.is_active) {
            return false;
          }
          if (promotion.type === 'TEMPORARY') {
            return true;
          }
          if (promotion.type === 'FIRST_TIME') {
            return !hasPriorOrder;
          }
          // Loyalty rule details are not available in current mobile endpoints.
          return false;
        });
        setAppliedPromotion(pickBestPromotion(eligible));
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [subtotal, user]);

  const discount = useMemo(() => {
    if (!appliedPromotion) {
      return 0;
    }
    return Math.min(subtotal, Math.max(0, toNumber(appliedPromotion.value)));
  }, [appliedPromotion, subtotal]);

  return {
    discount,
    total: subtotal - discount,
    loading,
    appliedPromotion,
  };
};
