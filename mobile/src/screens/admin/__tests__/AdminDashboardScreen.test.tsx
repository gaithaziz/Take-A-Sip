import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { AdminDashboardScreen } from '@/screens/admin/AdminDashboardScreen';

const mockListPromotions = jest.fn();
const mockListLoyaltyRules = jest.fn();
const mockListUsers = jest.fn();
const mockListRevenueSummary = jest.fn();
const mockGetMenuTree = jest.fn();
const translationMap: Record<string, string> = {
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.retry': 'Retry',
  'admin.dashboardTitle': 'Admin Overview',
  'admin.menuSections': 'Menu Sections',
  'admin.promotionsTitle': 'Promotions',
  'admin.loyaltyTitle': 'Loyalty Rules',
  'admin.usersTitle': 'Users',
  'admin.revenueSummary': 'Revenue Summary',
  'admin.revenueToday': 'Today',
  'admin.revenue7Days': 'Last 7 days',
  'admin.revenue30Days': 'Last 30 days',
  'admin.ordersCountLabel': 'orders',
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
    getMenuTree: (...args: any[]) => mockGetMenuTree(...args),
    listPromotions: (...args: any[]) => mockListPromotions(...args),
    listLoyaltyRules: (...args: any[]) => mockListLoyaltyRules(...args),
    listUsers: (...args: any[]) => mockListUsers(...args),
    listRevenueSummary: (...args: any[]) => mockListRevenueSummary(...args),
  },
}));

describe('AdminDashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMenuTree.mockResolvedValue({ sections: [{ id: 's1' }] });
    mockListPromotions.mockResolvedValue({ promotions: [{ id: 'p1' }] });
    mockListLoyaltyRules.mockResolvedValue({ rules: [{ id: 'l1' }] });
    mockListUsers.mockResolvedValue({ users: [{ id: 'u1' }] });
    mockListRevenueSummary.mockResolvedValue({
      today_revenue: '10',
      week_revenue: '40',
      month_revenue: '120',
      today_orders: 1,
      week_orders: 4,
      month_orders: 10,
    });
  });

  it('renders KPI data and supports section navigation taps', async () => {
    const navigate = jest.fn();
    const { getByText } = render(
      <AdminDashboardScreen navigation={{ navigate } as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(getByText('Admin Overview')).toBeTruthy();
      expect(getByText('Menu Sections')).toBeTruthy();
      expect(getByText('Revenue Summary')).toBeTruthy();
    });

    fireEvent.press(getByText('Promotions'));
    expect(navigate).toHaveBeenCalledWith('AdminPromotions');
  });
});
