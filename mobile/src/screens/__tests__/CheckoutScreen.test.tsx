import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { CheckoutScreen } from '@/screens/CheckoutScreen';

let mockStoreStatus = {
  minimum_delivery_order_amount: '0.00',
  minimum_pickup_order_amount: '0.00',
};

jest.mock('@/state/StoreStatusContext', () => ({
  useStoreStatus: () => ({
    status: mockStoreStatus,
    orderingEnabled: true,
    refresh: jest.fn().mockResolvedValue({ ordering_enabled: true }),
  }),
}));
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
        'checkout.deliveryMinimumMet': 'Delivery minimum reached',
        'checkout.deliveryMinimumRemaining': 'Add more for delivery',
        'checkout.pickupMinimumMet': 'Pickup minimum reached',
        'checkout.pickupMinimumRemaining': 'Add more for pickup',
        'checkout.paymentMethod': 'Payment method',
        'checkout.cash': 'Cash',
        'checkout.card': 'Card',
        'checkout.cashHint': 'Pay when receiving your order',
        'checkout.cardHint': 'Pay using the driver or shop card terminal',
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
    mockStoreStatus = {
      minimum_delivery_order_amount: '0.00',
      minimum_pickup_order_amount: '0.00',
    };
    (addressBook.list as jest.Mock).mockResolvedValue([]);
  });

  it('defaults to delivery and keeps submit disabled until delivery details are valid', () => {
    const { getByLabelText, getByTestId } = render(
      <CheckoutScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() } as never} route={{} as never} />,
    );

    expect(getByLabelText('Delivery').props.accessibilityState).toEqual({ selected: true });
    expect(getByTestId('checkout-place-order')).toBeDisabled();
    expect(orderService.create).not.toHaveBeenCalled();
  });

  it('submits the selected card payment method', async () => {
    (orderService.create as jest.Mock).mockResolvedValue({ id: 'order-1' });
    const navigate = jest.fn();
    const { getByText } = render(
      <CheckoutScreen navigation={{ navigate, goBack: jest.fn() } as never} route={{} as never} />,
    );

    fireEvent.press(getByText('Card'));
    fireEvent.press(getByText('Pickup'));
    fireEvent.press(getByText('Place order'));

    await waitFor(() => {
      expect(orderService.create).toHaveBeenCalledWith(
        expect.objectContaining({ payment_method: 'CARD', order_type: 'pickup' }),
      );
    });
  });

  it('switches between separate delivery and pickup minimums', () => {
    mockStoreStatus = {
      minimum_delivery_order_amount: '15.00',
      minimum_pickup_order_amount: '12.00',
    };
    const { getByText, getByTestId } = render(
      <CheckoutScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() } as never} route={{} as never} />,
    );

    expect(getByTestId('checkout-place-order')).toBeDisabled();
    expect(getByText('Add more for delivery')).toBeTruthy();
    fireEvent.press(getByText('Pickup'));
    expect(getByTestId('checkout-place-order')).toBeDisabled();
    expect(getByText('Add more for pickup')).toBeTruthy();
  });

  it('allows pickup when its selected minimum is met', () => {
    mockStoreStatus = {
      minimum_delivery_order_amount: '15.00',
      minimum_pickup_order_amount: '10.00',
    };
    const { getByText, getByTestId } = render(
      <CheckoutScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() } as never} route={{} as never} />,
    );

    fireEvent.press(getByText('Pickup'));
    expect(getByTestId('checkout-place-order')).toBeEnabled();
    expect(getByText(/Pickup minimum reached/)).toBeTruthy();
  });
});
