import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { ClientOrderDetailsScreen } from '@/screens/ClientOrderDetailsScreen';
import { orderService } from '@/services/orderService';

const mockOrder = {
  id: 'order-1',
  order_number: 101,
  user_id: 'user-1',
  status: 'ACCEPTED',
  order_type: 'pickup',
  created_at: '2026-03-15T10:00:00.000Z',
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
};

jest.mock('@/hooks/useAppTranslation', () => ({
  useAppTranslation: () => ({
    language: 'en',
    isRTL: false,
    t: (key: string) => {
      const map: Record<string, string> = {
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.retry': 'Retry',
        'common.goBack': 'Go back',
        'common.appName': 'Take A Sip',
        'common.cancel': 'Cancel',
        'errors.generic': 'Something went wrong.',
        'orders.detailsTitle': 'Order details',
        'orders.rateOrder': 'Rate order',
        'orders.submitRating': 'Submit rating',
        'orders.cancelOrder': 'Cancel order',
        'orders.cancelOrderConfirm': 'Cancel this order?',
        'orders.cancelOrderAvailable': 'You can cancel while the order is still new.',
        'orders.cancelled': 'Order cancelled',
        'orders.ratingNotePlaceholder': 'Optional review note',
        'orders.ratingStarsRequired': 'Please select a star rating',
        'orders.ratingSubmitted': 'Thanks for your feedback',
        'orders.ratingAvailableAfterAcceptance': 'Rating will be available as soon as the shop accepts this pickup order.',
        'orders.ratingAvailableAfterDelivery': 'Rating will be available as soon as this delivery is marked delivered.',
        'status.ACCEPTED': 'Accepted',
        'status.COMPLETED': 'Completed',
        'status.NEW': 'New',
        'status.CANCELLED': 'Cancelled',
      };
      return map[key] ?? key;
    },
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

jest.mock('@/components/AppShell', () => ({
  AppShell: ({ children }: { children: any }) => children,
}));

jest.mock('@/components/AppButton', () => {
  const { Pressable, Text } = require('react-native');
  return {
    AppButton: ({ title, onPress, testID, disabled }: { title: string; onPress: () => void; testID?: string; disabled?: boolean }) => (
      <Pressable onPress={onPress} testID={testID} disabled={disabled}>
        <Text>{title}</Text>
      </Pressable>
    ),
  };
});

jest.mock('@/services/orderService', () => ({
  orderService: {
    getById: jest.fn(),
    submitRating: jest.fn(),
    updateStatus: jest.fn(),
  },
}));

describe('ClientOrderDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  it('shows rating inputs for accepted pickup unrated order', async () => {
    (orderService.getById as jest.Mock).mockResolvedValue(mockOrder);

    const { findByText, findByPlaceholderText } = render(
      <ClientOrderDetailsScreen
        navigation={{ goBack: jest.fn() } as never}
        route={{ key: 'ClientOrderDetails', name: 'ClientOrderDetails', params: { orderId: 'order-1' } } as never}
      />,
    );

    await findByText('Order details');
    await findByText('Rate order');
    await findByPlaceholderText('Optional review note');
  });

  it('shows existing rating and hides submit controls when order already rated', async () => {
    (orderService.getById as jest.Mock).mockResolvedValue({
      ...mockOrder,
      rating: {
        id: 'rating-2',
        order_id: 'order-1',
        user_id: 'user-1',
        stars: 4,
        note: 'Nice service',
        created_at: '2026-03-15T10:30:00.000Z',
      },
    });

    const { getByText, queryByText } = render(
      <ClientOrderDetailsScreen
        navigation={{ goBack: jest.fn() } as never}
        route={{ key: 'ClientOrderDetails', name: 'ClientOrderDetails', params: { orderId: 'order-1' } } as never}
      />,
    );

    await waitFor(() => {
      expect(getByText('Nice service')).toBeTruthy();
    });
    expect(queryByText('Submit rating')).toBeNull();
  });

  it('shows a cancel action for new orders', async () => {
    (orderService.getById as jest.Mock).mockResolvedValue({ ...mockOrder, status: 'NEW' });

    const { getByText } = render(
      <ClientOrderDetailsScreen
        navigation={{ goBack: jest.fn() } as never}
        route={{ key: 'ClientOrderDetails', name: 'ClientOrderDetails', params: { orderId: 'order-1' } } as never}
      />,
    );

    await waitFor(() => {
      expect(getByText('You can cancel while the order is still new.')).toBeTruthy();
    });
  });
});
