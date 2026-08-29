import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { AdminStoreSettingsScreen } from '@/screens/admin/AdminStoreSettingsScreen';

const mockGetStoreSettings = jest.fn();
const mockUpdateStoreSettings = jest.fn();
const mockT = (key: string) => key;

jest.mock('@/hooks/useAppTranslation', () => ({
  useAppTranslation: () => ({ language: 'en', isRTL: false, t: mockT }),
}));

jest.mock('@/state/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', isRTL: false }),
}));

jest.mock('@/components/AppShell', () => ({ AppShell: ({ children }: { children: any }) => children }));
jest.mock('@/components/DateTimeField', () => ({ DateTimeField: ({ label }: { label: string }) => label }));

jest.mock('@/services/adminService', () => ({
  adminService: {
    getStoreSettings: (...args: unknown[]) => mockGetStoreSettings(...args),
    updateStoreSettings: (...args: unknown[]) => mockUpdateStoreSettings(...args),
  },
}));

describe('AdminStoreSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStoreSettings.mockResolvedValue({
      ordering_enabled: true,
      accepting_orders: true,
      timezone: 'Asia/Amman',
      working_hours: Array.from({ length: 7 }, (_, day_of_week) => ({
        day_of_week,
        is_open: true,
        opens_at: '09:00',
        closes_at: '23:00',
      })),
      minimum_delivery_order_amount: '0.00',
      minimum_pickup_order_amount: '0.00',
    });
    mockUpdateStoreSettings.mockResolvedValue({});
  });

  it('saves a complete seven-day schedule when working hours are enabled', async () => {
    const { findByText, getByText } = render(
      <AdminStoreSettingsScreen navigation={{ goBack: jest.fn() } as never} route={{} as never} />,
    );

    await findByText('admin.storeSettingsTitle');
    fireEvent.press(getByText('admin.saveStoreSettings'));

    await waitFor(() => expect(mockUpdateStoreSettings).toHaveBeenCalledWith(expect.objectContaining({
      ordering_enabled: true,
      minimum_delivery_order_amount: '0.00',
      minimum_pickup_order_amount: '0.00',
      working_hours: expect.arrayContaining([expect.objectContaining({ day_of_week: 0 })]),
    })));
    expect(mockUpdateStoreSettings.mock.calls[0][0].working_hours).toHaveLength(7);
  });
});
