import { render, waitFor } from '@testing-library/react-native';

import { DriverOrdersScreen } from '@/screens/driver/DriverOrdersScreen';
import { orderService } from '@/services/orderService';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useFocusEffect: jest.fn(),
  };
});

jest.mock('@/hooks/useAppTranslation', () => ({
  useAppTranslation: () => ({
    language: 'en',
    isRTL: false,
    t: (key: string) => {
      const map: Record<string, string> = {
        'common.loading': 'Loading...',
        'common.error': 'Error',
        'common.retry': 'Retry',
        'driver.ordersTitle': 'Assigned Orders',
        'driver.activeDeliveries': 'Active Deliveries',
        'driver.completedDeliveries': 'Completed Deliveries',
        'driver.noActiveDeliveries': 'No active',
        'driver.noCompletedDeliveries': 'No completed',
        'driver.noOrdersTitle': 'No orders',
        'driver.noOrdersSubtitle': 'No assigned',
        'status.DELIVERED': 'Delivered',
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

jest.mock('@/components/AppShell', () => ({
  AppShell: ({ children }: { children: any }) => children,
}));

jest.mock('@/services/orderService', () => ({
  orderService: {
    getDriverLatest: jest.fn(),
  },
}));

describe('DriverOrdersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('places DELIVERED orders in completed deliveries section', async () => {
    (orderService.getDriverLatest as jest.Mock).mockResolvedValue({
      orders: [
        {
          id: 'order-1',
          order_number: 111,
          status: 'DELIVERED',
          customer_name: 'Lina Client',
          customer_phone: '+962790000001',
          delivery_address_text: 'Amman',
        },
      ],
    });

    const { findByText } = render(
      <DriverOrdersScreen
        navigation={{ getParent: () => ({ navigate: jest.fn() }) } as never}
        route={{ key: 'DriverOrders', name: 'DriverOrders' } as never}
      />,
    );

    await findByText('Completed Deliveries', undefined, { timeout: 3000 });
    await findByText('Delivered', undefined, { timeout: 3000 });

    await waitFor(() => {
      expect(orderService.getDriverLatest).toHaveBeenCalled();
    });
  });
});
