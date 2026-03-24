import { renderHook, waitFor } from '@testing-library/react-native';

import { useCartPricing } from '@/hooks/useCartPricing';

const mockEvaluateCart = jest.fn();

jest.mock('@/services/promotionService', () => ({
  promotionService: {
    evaluateCart: (...args: any[]) => mockEvaluateCart(...args),
  },
}));

jest.mock('@/state/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1', role: 'CLIENT' },
  }),
}));

describe('useCartPricing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEvaluateCart.mockResolvedValue({
      applied_promotion: {
        id: 'promo-1',
        title_en: 'Latte Loyalty',
        title_ar: 'ولاء اللاتيه',
        type: 'LOYALTY',
        value: '3.00',
        starts_at: '2026-03-23T08:00:00Z',
        ends_at: '2026-03-25T08:00:00Z',
        is_active: true,
        loyalty_rule_id: 'rule-1',
        targets: [],
        scope_summary_en: 'Applies to the whole menu',
        scope_summary_ar: 'ينطبق على كامل القائمة',
        eligibility_summary_en: 'Available every 5 completed orders',
        eligibility_summary_ar: 'متاح كل 5 طلبات مكتملة',
      },
      discount: '3.00',
      eligible_promotions: [],
      ineligible_promotions: [],
    });
  });

  it('uses backend promotion evaluation for cart pricing', async () => {
    const item = {
      id: 'cart-1',
      item: {
        id: 'item-1',
        section_id: 'section-1',
        name_en: 'Latte',
        name_ar: 'لاتيه',
        image_url: null,
        description_en: null,
        description_ar: null,
        sort_order: 1,
        is_active: true,
        item_types: [],
      },
      itemType: {
        id: 'type-1',
        item_id: 'item-1',
        name_en: 'Hot',
        name_ar: 'ساخن',
        image_url: null,
        sort_order: 1,
        is_active: true,
        sizes: [],
      },
      size: {
        id: 'size-1',
        type_id: 'type-1',
        name_en: 'Large',
        name_ar: 'كبير',
        image_url: null,
        price: '4.00',
        sort_order: 1,
        is_active: true,
        addons: [],
      },
      addons: [
        {
          id: 'addon-1',
          size_id: 'size-1',
          name_en: 'Shot',
          name_ar: 'شوت',
          image_url: null,
          price: '1.00',
          sort_order: 1,
          is_active: true,
        },
      ],
      quantity: 2,
    };

    const { result } = renderHook(() => useCartPricing([item], 10));

    await waitFor(() => {
      expect(mockEvaluateCart).toHaveBeenCalledWith({
        items: [
          {
            size_id: 'size-1',
            quantity: 2,
            addon_ids: ['addon-1'],
          },
        ],
      });
      expect(result.current.discount).toBe(3);
      expect(result.current.total).toBe(7);
      expect(result.current.appliedPromotion?.id).toBe('promo-1');
    });
  });
});
