import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { AdminDashboardScreen } from '@/screens/admin/AdminDashboardScreen';

const mockListPromotions = jest.fn();
const mockListLoyaltyRules = jest.fn();
const mockListUsers = jest.fn();
const mockListSchedules = jest.fn();
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
  'admin.starBreakdown': 'Star breakdown',
  'admin.viewAllReviews': 'View all reviews',
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
    listSchedules: (...args: any[]) => mockListSchedules(...args),
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
    mockListUsers.mockResolvedValue({
      users: [
        { id: 'u1', role: 'CLIENT' },
        { id: 'u2', role: 'ADMIN' },
        { id: 'u3', role: 'FRONTDESK' },
        { id: 'u4', role: 'DRIVER' },
      ],
    });
    mockListSchedules.mockResolvedValue({ schedules: [{ id: 'schedule-1' }, { id: 'schedule-2' }] });
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

  it('renders corrected dashboard stats and supports section navigation taps', async () => {
    const navigate = jest.fn();
    const parentNavigate = jest.fn();
    const { getAllByText, getByText } = render(
      <AdminDashboardScreen navigation={{ navigate, getParent: () => ({ navigate: parentNavigate }) } as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(getByText('Admin Overview')).toBeTruthy();
      expect(getByText('Quick actions')).toBeTruthy();
      expect(getByText('Needs attention')).toBeTruthy();
      expect(getByText('No promotions are live right now.')).toBeTruthy();
      expect(getByText('No loyalty rules are configured yet.')).toBeTruthy();
      expect(getAllByText('2').length).toBeGreaterThan(0);
      expect(getAllByText('3').length).toBeGreaterThan(0);
      expect(getByText('Star breakdown')).toBeTruthy();
    });

    fireEvent.press(getByText('Promotions'));
    expect(navigate).toHaveBeenCalledWith('AdminPromotions');

    expect(mockListSchedules).toHaveBeenCalledTimes(1);
    expect(mockListRatings).toHaveBeenCalledWith(3);
    expect(parentNavigate).not.toHaveBeenCalled();
  });

  it('shows only the recent review preview and opens the full reviews screen', async () => {
    const navigate = jest.fn();
    const parentNavigate = jest.fn();
    mockListRatings.mockResolvedValue({
      ratings: [
        { order_id: 'o1', stars: 5, note: 'Excellent', customer_name: 'Maya Client', created_at: '2026-03-10T10:00:00Z' },
        { order_id: 'o2', stars: 4, note: null, customer_name: 'Lina Client', created_at: '2026-03-09T10:00:00Z' },
        { order_id: 'o3', stars: 3, note: 'Okay', customer_name: 'Rana Client', created_at: '2026-03-08T10:00:00Z' },
      ],
    });

    const { getByText, queryByText } = render(
      <AdminDashboardScreen navigation={{ navigate, getParent: () => ({ navigate: parentNavigate }) } as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(getByText('View all reviews')).toBeTruthy();
      expect(getByText('Maya Client')).toBeTruthy();
      expect(getByText('Lina Client')).toBeTruthy();
      expect(getByText('Rana Client')).toBeTruthy();
    });

    expect(queryByText('Fourth Client')).toBeNull();

    fireEvent.press(getByText('View all reviews'));
    expect(parentNavigate).toHaveBeenCalledWith('AdminReviews');
  });
});
