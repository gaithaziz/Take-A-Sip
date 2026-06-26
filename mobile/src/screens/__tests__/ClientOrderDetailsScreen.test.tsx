import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { ClientOrderDetailsScreen } from '@/screens/ClientOrderDetailsScreen';
import { orderService } from '@/services/orderService';

const mockT = (key: string) => {
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
    'orders.statusInProgress': 'In progress',
    'orders.estimatedReadyTime': 'Estimated ready time: 5–25 minutes',
    'status.ACCEPTED': 'Accepted',
    'status.COMPLETED': 'Completed',
    'status.NEW': 'New',
    'status.CANCELLED': 'Cancelled',
  };
  return map[key] ?? key;
};

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
      item_id_snapshot: 'item-1',
      size_id_snapshot: 'size-1',
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
    t: mockT,
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

jest.mock('@/services/menuService', () => ({
  menuService: {
    getMenu: jest.fn(async () => ({
      sections: [
        {
          id: 'section-1',
          name_en: 'Coffee',
          name_ar: 'قهوة',
          image_url: null,
          is_active: true,
          sort_order: 0,
          items: [
            {
              id: 'item-1',
              section_id: 'section-1',
              name_en: 'Latte',
              name_ar: 'لاتيه',
              image_url: null,
              description_en: null,
              description_ar: null,
              sort_order: 0,
              is_active: true,
              item_types: [
                {
                  id: 'type-1',
                  item_id: 'item-1',
                  name_en: 'Hot',
                  name_ar: 'ساخن',
                  image_url: null,
                  sort_order: 0,
                  is_active: true,
                  sizes: [
                    {
                      id: 'size-1',
                      type_id: 'type-1',
                      name_en: 'Large',
                      name_ar: 'كبير',
                      image_url: null,
                      price: '3.50',
                      sort_order: 0,
                      is_active: true,
                      addons: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })),
  },
}));

describe('ClientOrderDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  it('shows rating inputs for accepted pickup unrated order', async () => {
    (orderService.getById as jest.Mock).mockResolvedValue(mockOrder);

    const { findByText, findAllByText, findByPlaceholderText } = render(
      <ClientOrderDetailsScreen
        navigation={{ goBack: jest.fn() } as never}
        route={{ key: 'ClientOrderDetails', name: 'ClientOrderDetails', params: { orderId: 'order-1' } } as never}
      />,
    );

    await findByText('Order details');
    await findByText('Rate order');
    await findByPlaceholderText('Optional review note');
    await expect(findAllByText('In progress')).resolves.toHaveLength(2);
    await findByText('Estimated ready time: 5–25 minutes');
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
