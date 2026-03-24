import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { AdminUsersScreen } from '@/screens/admin/AdminUsersScreen';

const mockListUsers = jest.fn();
const mockBanUser = jest.fn();
const translationMap: Record<string, string> = {
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.retry': 'Retry',
  'admin.usersTitle': 'Users',
  'admin.searchUsers': 'Search users',
  'admin.searchByNameOrPhone': 'Search by name or phone',
  'admin.filterAll': 'All',
  'admin.filterBanned': 'Banned',
  'admin.filterActive': 'Unbanned',
  'admin.orderCount': 'Order count',
  'admin.active': 'Active',
  'admin.ban': 'Ban',
  'admin.viewOrders': 'View orders',
  'admin.role': 'Role',
  'roles.CLIENT': 'Client',
};
const mockTranslate = (key: string) => translationMap[key] ?? key;

jest.mock('@/hooks/useAppTranslation', () => ({
  useAppTranslation: () => ({
    language: 'en',
    isRTL: false,
    t: mockTranslate,
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

jest.mock('@/services/adminService', () => ({
  adminService: {
    listUsers: (...args: any[]) => mockListUsers(...args),
    banUser: (...args: any[]) => mockBanUser(...args),
    unbanUser: jest.fn(),
  },
}));

describe('AdminUsersScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListUsers.mockResolvedValue({
      users: [
        {
          id: 'u1',
          first_name: 'Lina',
          last_name: 'K',
          phone_number: '0790000000',
          role: 'CLIENT',
          is_active: true,
          is_banned: false,
          banned_at: null,
          banned_reason: null,
          order_count: 3,
          created_at: '2026-03-09T00:00:00Z',
        },
      ],
    });
  });

  it('navigates to user details from view orders action', async () => {
    const navigate = jest.fn();
    const { getByText } = render(
      <AdminUsersScreen
        navigation={{ getParent: () => ({ navigate }) } as never}
        route={{} as never}
      />,
    );

    await waitFor(() => {
      expect(getByText('Users')).toBeTruthy();
      expect(getByText('Lina K')).toBeTruthy();
      expect(getByText('View orders')).toBeTruthy();
    });

    fireEvent.press(getByText('View orders'));
    expect(navigate).toHaveBeenCalledWith('AdminUserDetails', {
      user: expect.objectContaining({ id: 'u1' }),
    });
  });

  it('applies status filters immediately without an apply button', async () => {
    const { getByTestId, queryByText } = render(
      <AdminUsersScreen
        navigation={{ getParent: jest.fn() } as never}
        route={{} as never}
      />,
    );

    await waitFor(() => {
      expect(mockListUsers).toHaveBeenCalledWith(undefined, null);
      expect(queryByText('Apply filters')).toBeNull();
    });

    fireEvent.press(getByTestId('users-filter-banned'));

    await waitFor(() => {
      expect(mockListUsers).toHaveBeenCalledWith(undefined, true);
    });
  });
});
