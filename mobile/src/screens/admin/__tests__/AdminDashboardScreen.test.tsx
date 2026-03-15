import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { AdminDashboardScreen } from '@/screens/admin/AdminDashboardScreen';

const mockListPromotions = jest.fn();
const mockListLoyaltyRules = jest.fn();
const mockListUsers = jest.fn();
const mockGetDashboardAnalytics = jest.fn();
const mockListLatestOrders = jest.fn();
const mockGetMenuTree = jest.fn();
const mockListRatings = jest.fn();
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
  'admin.ratingsOverviewTitle': 'Ratings Overview',
  'admin.averageRating': 'Average rating',
  'admin.totalRatings': 'Total ratings',
  'admin.recentReviews': 'Recent reviews',
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
    getDashboardAnalytics: (...args: any[]) => mockGetDashboardAnalytics(...args),
    listRatings: (...args: any[]) => mockListRatings(...args),
    listLatestOrders: (...args: any[]) => mockListLatestOrders(...args),
  },
}));

describe('AdminDashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMenuTree.mockResolvedValue({ sections: [{ id: 's1' }] });
    mockListPromotions.mockResolvedValue({ promotions: [{ id: 'p1' }] });
    mockListLoyaltyRules.mockResolvedValue({ rules: [{ id: 'l1' }] });
    mockListUsers.mockResolvedValue({ users: [{ id: 'u1' }] });
    mockGetDashboardAnalytics.mockResolvedValue({
      revenue: {
        today_revenue: '10',
        week_revenue: '40',
        month_revenue: '120',
        today_orders: 1,
        week_orders: 4,
        month_orders: 10,
      },
      orders: {
        total_orders_today: 3,
        pickup_orders_today: 2,
        delivery_orders_today: 1,
        pickup_delivery_ratio: '2:1',
        average_order_value: '12.75',
      },
      ratings: {
        average_rating: 4.2,
        total_ratings: 6,
        stars_breakdown: { '1': 0, '2': 1, '3': 1, '4': 2, '5': 2 },
      },
      drivers: {
        deliveries_completed_today: 1,
        deliveries_per_driver: [{ driver_id: 'd1', driver_name: 'Omar Driver', deliveries_completed_today: 1 }],
      },
    });
    mockListRatings.mockResolvedValue({
      ratings: [],
    });
    mockListLatestOrders.mockResolvedValue({
      orders: [],
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
      expect(getByText('Ratings Overview')).toBeTruthy();
    });

    fireEvent.press(getByText('Promotions'));
    expect(navigate).toHaveBeenCalledWith('AdminPromotions');
  });
});
