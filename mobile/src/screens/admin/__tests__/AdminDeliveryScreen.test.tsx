import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { AdminDeliveryScreen } from '@/screens/admin/AdminDeliveryScreen';

const mockListDeliveryDistanceBands = jest.fn();
const mockListDrivers = jest.fn();
const mockListLatestOrders = jest.fn();
const translationMap: Record<string, string> = {
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.retry': 'Retry',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'admin.deliveryTitle': 'Delivery Operations',
  'admin.deliveryFeeBands': 'Distance Fee Bands',
  'admin.addDistanceBand': 'Add distance band',
  'admin.minDistanceKm': 'Min distance (km)',
  'admin.maxDistanceKm': 'Max distance (km)',
  'admin.feeAmount': 'Fee amount',
  'admin.disable': 'Disable',
  'admin.enable': 'Enable',
  'admin.delete': 'Delete',
  'admin.active': 'Active',
  'admin.inactive': 'Inactive',
  'admin.driversTitle': 'Drivers',
  'admin.latestDeliveryOrders': 'Latest Delivery Orders',
  'admin.noUsersSubtitle': 'No users match current filters.',
  'admin.orderCount': 'Order count',
  'profile.phone': 'Phone',
};
const mockTranslate = (key: string) => translationMap[key] ?? key;

jest.mock('@/hooks/useAppTranslation', () => ({
  useAppTranslation: () => ({
    language: 'en',
    isRTL: false,
    t: mockTranslate,
  }),
}));

jest.mock('@/components/AppShell', () => ({
  AppShell: ({ children }: { children: any }) => children,
}));

jest.mock('@/state/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    isRTL: false,
    toggleLanguage: jest.fn(),
  }),
}));

jest.mock('@/services/adminService', () => ({
  adminService: {
    listDeliveryDistanceBands: (...args: any[]) => mockListDeliveryDistanceBands(...args),
    listDrivers: (...args: any[]) => mockListDrivers(...args),
    listLatestOrders: (...args: any[]) => mockListLatestOrders(...args),
    createDeliveryDistanceBand: jest.fn(),
    updateDeliveryDistanceBand: jest.fn(),
    deleteDeliveryDistanceBand: jest.fn(),
    assignDriverToOrder: jest.fn(),
  },
}));

describe('AdminDeliveryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    mockListDeliveryDistanceBands.mockResolvedValue({
      bands: [
        {
          id: 'band-1',
          min_distance_km: '0',
          max_distance_km: '5',
          fee_amount: '2.5',
          is_active: true,
          sort_order: 0,
          created_at: '2026-03-01T00:00:00Z',
          updated_at: '2026-03-01T00:00:00Z',
        },
      ],
    });
    mockListDrivers.mockResolvedValue({ users: [] });
    mockListLatestOrders.mockResolvedValue({ orders: [] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('asks for confirmation before toggling a distance band', async () => {
    const { getByText } = render(
      <AdminDeliveryScreen navigation={{} as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(getByText('Distance Fee Bands')).toBeTruthy();
      expect(getByText('Disable')).toBeTruthy();
    });

    fireEvent.press(getByText('Disable'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Disable',
      'Disable: 0-5 km',
      expect.any(Array),
    );
  });
});
