import { render } from '@testing-library/react-native';

import { DriverOrderDetailsScreen } from '@/screens/driver/DriverOrderDetailsScreen';
import { orderService } from '@/services/orderService';

const mockT = (key: string) => {
  const map: Record<string, string> = {
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.retry': 'Retry',
    'common.appName': 'Take A Sip',
    'errors.generic': 'Something went wrong.',
    'driver.items': 'Items',
    'driver.openMaps': 'Open in Google Maps',
    'driver.markOutForDelivery': 'Mark Out For Delivery',
    'driver.markDelivered': 'Mark Delivered',
    'driver.noDestination': 'No destination',
    'orders.paymentCard': 'Card terminal when receiving',
  };
  return map[key] ?? key;
};

const mockOrder = {
  id: 'order-1',
  order_number: 401,
  user_id: 'user-1',
  customer_name: 'Omar Driver',
  customer_phone: '+962790000001',
  delivery_address_text: 'Amman 7th Circle',
  delivery_address: 'Amman 7th Circle',
  delivery_latitude: '31.9639',
  delivery_longitude: '35.9206',
  google_maps_url: null,
  status: 'OUT_FOR_DELIVERY',
  order_type: 'delivery',
  payment_method: 'CARD',
  created_at: '2026-03-18T10:00:00.000Z',
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

jest.mock('@/components/AppShell', () => ({
  AppShell: ({ children }: { children: any }) => children,
}));

jest.mock('@/services/orderService', () => ({
  orderService: {
    getById: jest.fn(),
    updateStatus: jest.fn(),
  },
}));

jest.mock('@/services/menuService', () => ({
  menuService: {
    getMenu: jest.fn(async () => ({ sections: [] })),
  },
}));

describe('DriverOrderDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders delivery actions for assigned driver order', async () => {
    (orderService.getById as jest.Mock).mockResolvedValue(mockOrder);

    const { findByText } = render(
      <DriverOrderDetailsScreen
        navigation={{} as never}
        route={{ key: 'DriverOrderDetails', name: 'DriverOrderDetails', params: { orderId: 'order-1' } } as never}
      />,
    );

    await findByText('#401');
    await findByText('Open in Google Maps');
    await findByText('Mark Delivered');
    await findByText('Card terminal when receiving');
  });
});
