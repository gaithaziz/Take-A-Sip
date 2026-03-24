import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { AdminStaffScreen } from '@/screens/admin/AdminStaffScreen';

const mockListUsers = jest.fn();
const mockProvisionStaff = jest.fn();
const mockArchiveStaff = jest.fn();
const mockUnarchiveStaff = jest.fn();
const mockDeleteStaff = jest.fn();

const translationMap: Record<string, string> = {
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.retry': 'Retry',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.appName': 'Take A Sip',
  'validation.requiredFields': 'Required fields',
  'admin.staffTitle': 'Staff Management',
  'admin.provisionStaffTitle': 'Provision Staff',
  'admin.provisionStaffCta': 'Create or update staff',
  'admin.staffCreated': 'Staff account created',
  'admin.staffUpdated': 'Staff account updated',
  'admin.role': 'Role',
  'admin.usersTitle': 'Users',
  'admin.filterAll': 'All',
  'admin.noUsersTitle': 'No users',
  'admin.noUsersSubtitle': 'No users match current filters.',
  'admin.orderCount': 'Order count',
  'admin.active': 'Active',
  'admin.archived': 'Archived',
  'admin.banned': 'Banned',
  'admin.archive': 'Archive',
  'admin.unarchive': 'Unarchive',
  'admin.delete': 'Delete',
  'admin.archiveStaff': 'Archive staff account',
  'admin.unarchiveStaff': 'Unarchive staff account',
  'admin.deleteStaff': 'Delete staff account',
  'admin.archiveStaffConfirm': 'This staff member will lose access until you unarchive the account.',
  'admin.unarchiveStaffConfirm': 'This staff member will regain access to the admin or driver tools.',
  'admin.deleteStaffConfirm': 'This permanently deletes the archived staff account. This cannot be undone.',
  'auth.firstName': 'First name',
  'auth.lastName': 'Last name',
  'auth.phoneNumber': 'Phone number',
  'profile.phone': 'Phone',
  'roles.ADMIN': 'Admin',
  'roles.FRONTDESK': 'Frontdesk',
  'roles.DRIVER': 'Driver',
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

jest.mock('@/state/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'admin-self' },
  }),
}));

jest.mock('@/components/AppShell', () => ({
  AppShell: ({ children }: { children: any }) => children,
}));

jest.mock('@/services/adminService', () => ({
  adminService: {
    listUsers: (...args: any[]) => mockListUsers(...args),
    provisionStaff: (...args: any[]) => mockProvisionStaff(...args),
    archiveStaff: (...args: any[]) => mockArchiveStaff(...args),
    unarchiveStaff: (...args: any[]) => mockUnarchiveStaff(...args),
    deleteStaff: (...args: any[]) => mockDeleteStaff(...args),
  },
}));

describe('AdminStaffScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    mockListUsers.mockImplementation((_search?: string, _banned?: boolean | null, role?: string) => {
      if (role === 'ADMIN') {
        return Promise.resolve({
          users: [
            {
              id: 'admin-self',
              first_name: 'Self',
              last_name: 'Admin',
              phone_number: '0790000001',
              role: 'ADMIN',
              is_active: true,
              is_banned: false,
              banned_at: null,
              banned_reason: null,
              order_count: 0,
              created_at: '2026-03-24T00:00:00Z',
            },
          ],
        });
      }
      if (role === 'FRONTDESK') {
        return Promise.resolve({
          users: [
            {
              id: 'frontdesk-1',
              first_name: 'Desk',
              last_name: 'Agent',
              phone_number: '0790000002',
              role: 'FRONTDESK',
              is_active: false,
              is_banned: false,
              banned_at: null,
              banned_reason: null,
              order_count: 0,
              created_at: '2026-03-24T00:00:00Z',
            },
          ],
        });
      }
      return Promise.resolve({
        users: [
          {
            id: 'driver-1',
            first_name: 'Driver',
            last_name: 'One',
            phone_number: '0790000003',
            role: 'DRIVER',
            is_active: true,
            is_banned: false,
            banned_at: null,
            banned_reason: null,
            order_count: 0,
            created_at: '2026-03-24T00:00:00Z',
          },
        ],
      });
    });
    mockArchiveStaff.mockResolvedValue({ id: 'driver-1', role: 'DRIVER', is_active: false, is_banned: false });
    mockUnarchiveStaff.mockResolvedValue({ id: 'frontdesk-1', role: 'FRONTDESK', is_active: true, is_banned: false });
    mockDeleteStaff.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('supports archive, unarchive, and permanent delete actions for staff roster entries', async () => {
    const { getByText, getAllByText } = render(<AdminStaffScreen />);

    await waitFor(() => {
      expect(getAllByText('Staff Management').length).toBeGreaterThan(0);
      expect(getByText('Driver One')).toBeTruthy();
      expect(getByText('Desk Agent')).toBeTruthy();
    });

    fireEvent.press(getAllByText('Archive')[0]!);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Archive staff account',
      'This staff member will lose access until you unarchive the account.',
      expect.any(Array),
    );
    let archiveButtons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] as Array<{ onPress?: () => void }>;
    archiveButtons[1]?.onPress?.();

    await waitFor(() => {
      expect(mockArchiveStaff).toHaveBeenCalledWith('driver-1');
    });

    fireEvent.press(getByText('Unarchive'));
    expect(Alert.alert).toHaveBeenCalledWith(
      'Unarchive staff account',
      'This staff member will regain access to the admin or driver tools.',
      expect.any(Array),
    );
    const unarchiveButtons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] as Array<{ onPress?: () => void }>;
    unarchiveButtons[1]?.onPress?.();

    await waitFor(() => {
      expect(mockUnarchiveStaff).toHaveBeenCalledWith('frontdesk-1');
    });

    fireEvent.press(getAllByText('Delete')[0]!);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete staff account',
      'This permanently deletes the archived staff account. This cannot be undone.',
      expect.any(Array),
    );
    const deleteButtons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] as Array<{ onPress?: () => void }>;
    deleteButtons[1]?.onPress?.();

    await waitFor(() => {
      expect(mockDeleteStaff).toHaveBeenCalledWith('frontdesk-1');
    });
  });
});
