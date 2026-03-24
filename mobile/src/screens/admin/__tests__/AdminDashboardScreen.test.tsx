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
  'admin.quickActions': 'Quick actions',
  'admin.tapToOpen': 'Tap to open',
  'admin.menuSections': 'Menu Sections',
  'admin.promotionsTitle': 'Promotions',
  'admin.loyaltyTitle': 'Loyalty Rules',
  'admin.usersTitle': 'Users',
  'admin.staffTitle': 'Staff',
  'admin.deliveryTitle': 'Delivery',
  'admin.schedulingTitle': 'Scheduling',
  'admin.profileTitle': 'Profile',
  'admin.revenueSummary': 'Revenue Summary',
  'admin.revenueToday': 'Today',
  'admin.revenue7Days': 'Last 7 days',
  'admin.revenue30Days': 'Last 30 days',
  'admin.ordersCountLabel': 'orders',
  'admin.ordersAnalyticsTitle': 'Order Analytics',
  'admin.totalOrdersToday': 'Total orders today',
  'admin.averageOrderValue': 'Average order value',
  'admin.driverAnalyticsTitle': 'Driver Analytics',
  'admin.deliveriesCompletedToday': 'Deliveries completed today',
  'admin.noDriverDeliveries': 'No completed deliveries yet today.',
  'admin.latestOrdersTitle': 'Latest Orders',
  'admin.noLatestOrders': 'No recent orders found.',
  'admin.ratingsOverviewTitle': 'Ratings Overview',
  'admin.averageRating': 'Average rating',
  'admin.totalRatings': 'Total ratings',
  'admin.recentReviews': 'Recent reviews',
  'admin.noReviewsTitle': 'No reviews yet',
  'admin.noReviewsSubtitle': 'Completed order reviews will appear here.',
  'admin.attentionTitle': 'Needs attention',
  'admin.attentionNoPromotions': 'No promotions are live right now.',
  'admin.attentionNoLoyaltyRules': 'No loyalty rules are configured yet.',
  'admin.attentionNoRecentOrders': 'There are no recent orders to review.',
  'admin.attentionNoRatings': 'No customer ratings have been submitted yet.',
  'admin.none': 'None',
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
    mockListPromotions.mockResolvedValue({ promotions: [] });
    mockListLoyaltyRules.mockResolvedValue({ rules: [] });
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
        average_rating: 0,
        total_ratings: 0,
        stars_breakdown: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      },
      drivers: {
        deliveries_completed_today: 1,
        deliveries_per_driver: [],
      },
    });
    mockListRatings.mockResolvedValue({
      ratings: [],
    });
    mockListLatestOrders.mockResolvedValue({
      orders: [],
    });
  });

  it('renders attention items and supports section navigation taps', async () => {
    const navigate = jest.fn();
    const { getByText } = render(
      <AdminDashboardScreen navigation={{ navigate, getParent: jest.fn() } as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(getByText('Admin Overview')).toBeTruthy();
      expect(getByText('Quick actions')).toBeTruthy();
      expect(getByText('Needs attention')).toBeTruthy();
      expect(getByText('No promotions are live right now.')).toBeTruthy();
      expect(getByText('No loyalty rules are configured yet.')).toBeTruthy();
    });

    fireEvent.press(getByText('Promotions'));
    expect(navigate).toHaveBeenCalledWith('AdminPromotions');
  });
});
