import { fireEvent, render } from '@testing-library/react-native';

import { CheckoutScreen } from '@/screens/CheckoutScreen';
import { orderService } from '@/services/orderService';
import { addressBook } from '@/services/addressBook';

jest.mock('@/hooks/useAppTranslation', () => ({
  useAppTranslation: () => ({
    language: 'en',
    isRTL: false,
    t: (key: string) => {
      const map: Record<string, string> = {
        'checkout.title': 'Checkout',
        'checkout.pickup': 'Pickup',
        'checkout.delivery': 'Delivery',
        'checkout.deliveryAddress': 'Delivery address',
        'checkout.deliveryAddressRequired': 'Delivery address is required',
        'checkout.savedAddresses': 'Saved addresses',
        'checkout.saveThisAddress': 'Save this address',
        'checkout.savedAddressHint': 'You can save this delivery address for next time.',
        'checkout.noSavedAddresses': 'Saved delivery addresses will appear here after you save one.',
        'checkout.placeOrder': 'Place order',
        'common.notes': 'Notes',
        'common.subtotal': 'Subtotal',
        'common.discount': 'Discount',
        'common.total': 'Total',
        'common.goBack': 'Go back',
      };
      return map[key] ?? key;
    },
  }),
}));

jest.mock('@/state/AuthContext', () => ({
  useAuth: () => ({
    token: 'token-1',
    user: { id: 'u1', role: 'CLIENT' },
  }),
}));

jest.mock('@/state/CartContext', () => ({
  useCart: () => ({
    items: [{ size: { id: 's1' }, addons: [], quantity: 1 }],
    subtotal: 10,
    clearCart: jest.fn(),
  }),
}));

jest.mock('@/hooks/useCartPricing', () => ({
  useCartPricing: () => ({
    discount: 2,
    total: 8,
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

jest.mock('@/services/orderService', () => ({
  orderService: {
    create: jest.fn(),
  },
}));

jest.mock('@/services/addressBook', () => ({
  addressBook: {
    list: jest.fn().mockResolvedValue([]),
    save: jest.fn(),
    remove: jest.fn(),
  },
}));

describe('CheckoutScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (addressBook.list as jest.Mock).mockResolvedValue([]);
  });

  it('shows inline delivery address error and keeps submit disabled until valid', () => {
    const { getByText, getByTestId } = render(
      <CheckoutScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() } as never} route={{} as never} />,
    );

    fireEvent.press(getByText('Delivery'));

    expect(getByText('Delivery address is required')).toBeTruthy();
    expect(getByTestId('checkout-place-order')).toBeDisabled();
    expect(orderService.create).not.toHaveBeenCalled();
  });
});
