import { render, waitFor } from '@testing-library/react-native';

import { PastOrdersScreen } from '@/screens/PastOrdersScreen';
import { orderService } from '@/services/orderService';

const t = (key: string) => {
  const map: Record<string, string> = {
    'orders.title': 'Past Orders',
    'orders.emptyTitle': 'No past orders',
    'orders.emptySubtitle': 'Your previous orders will appear here.',
    'orders.rateOrder': 'Rate order',
    'orders.ratingReady': 'You can rate this order now.',
    'common.loading': 'Loading...',
  };
  return map[key] ?? key;
};

jest.mock('@/hooks/useAppTranslation', () => ({
  useAppTranslation: () => ({
    language: 'en',
    isRTL: false,
    t,
  }),
}));

jest.mock('@/state/CartContext', () => ({
  useCart: () => ({
    clearCart: jest.fn(),
    addItem: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/state/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    isRTL: false,
    toggleLanguage: jest.fn(),
  }),
}));

jest.mock('@/services/orderService', () => ({
  orderService: {
    getMyLatest: jest.fn(),
  },
}));

jest.mock('@/services/menuService', () => ({
  menuService: {
    getMenu: jest.fn(async () => ({ sections: [] })),
  },
}));

describe('PastOrdersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when there are no orders', async () => {
    (orderService.getMyLatest as jest.Mock).mockResolvedValue({ orders: [] });

    const { getByText } = render(
      <PastOrdersScreen navigation={{ getParent: () => ({ navigate: jest.fn() }) } as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(getByText('No past orders')).toBeTruthy();
    });
  });

  it('shows a rate order button for accepted pickup orders', async () => {
    (orderService.getMyLatest as jest.Mock).mockResolvedValue({
      orders: [
        {
          id: 'order-1',
          order_number: 10,
          user_id: 'user-1',
          status: 'ACCEPTED',
          order_type: 'pickup',
          created_at: '2026-03-15T10:00:00.000Z',
          delivery_fee: null,
          notes: null,
          items: [
            {
              id: 'line-1',
              item_name_snapshot: 'Latte',
              size_snapshot: 'Large',
              price_snapshot: '3.50',
              quantity: 1,
              addons: [],
            },
          ],
          rating: null,
        },
      ],
    });

    const { getByText } = render(
      <PastOrdersScreen navigation={{ getParent: () => ({ navigate: jest.fn() }) } as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(getByText('Rate order')).toBeTruthy();
      expect(getByText('You can rate this order now.')).toBeTruthy();
    });
  });
});
