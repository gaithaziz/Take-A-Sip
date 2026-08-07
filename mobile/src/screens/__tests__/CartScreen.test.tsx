import { render } from '@testing-library/react-native';

import { CartScreen } from '@/screens/CartScreen';

jest.mock('@/hooks/useAppTranslation', () => ({
  useAppTranslation: () => ({
    language: 'en',
    isRTL: false,
    t: (key: string) => {
      const map: Record<string, string> = {
        'cart.title': 'Cart',
        'cart.emptyTitle': 'Your cart is empty',
        'cart.emptySubtitle': 'Add something tasty from the menu.',
      };
      return map[key] ?? key;
    },
  }),
}));

jest.mock('@/state/CartContext', () => ({
  useCart: () => ({
    items: [],
    subtotal: 0,
    removeItem: jest.fn(),
    updateQuantity: jest.fn(),
  }),
}));

jest.mock('@/state/StoreStatusContext', () => ({
  useStoreStatus: () => ({ orderingEnabled: true, refresh: jest.fn() }),
}));

jest.mock('@/hooks/useCartPricing', () => ({
  useCartPricing: () => ({
    discount: 0,
    total: 0,
    loading: false,
    appliedPromotion: null,
  }),
}));

jest.mock('@/state/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    isRTL: false,
    toggleLanguage: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('CartScreen', () => {
  it('renders empty state when cart has no items', () => {
    const { getByText } = render(<CartScreen navigation={{ navigate: jest.fn() } as never} route={{} as never} />);

    expect(getByText('Your cart is empty')).toBeTruthy();
  });
});
