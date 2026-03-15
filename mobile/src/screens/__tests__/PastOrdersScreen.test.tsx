import { render, waitFor } from '@testing-library/react-native';

import { PastOrdersScreen } from '@/screens/PastOrdersScreen';
import { orderService } from '@/services/orderService';

jest.mock('@/hooks/useAppTranslation', () => ({
  useAppTranslation: () => ({
    language: 'en',
    isRTL: false,
    t: (key: string) => {
      const map: Record<string, string> = {
        'orders.title': 'Past Orders',
        'orders.emptyTitle': 'No past orders',
        'orders.emptySubtitle': 'Your previous orders will appear here.',
        'common.loading': 'Loading...',
      };
      return map[key] ?? key;
    },
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

describe('PastOrdersScreen', () => {
  it('renders empty state when there are no orders', async () => {
    (orderService.getMyLatest as jest.Mock).mockResolvedValue({ orders: [] });

    const { getByText } = render(
      <PastOrdersScreen navigation={{ getParent: () => ({ navigate: jest.fn() }) } as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(getByText('No past orders')).toBeTruthy();
    });
  });
});
