import { fireEvent, render } from '@testing-library/react-native';

import { ProfileScreen } from '@/screens/ProfileScreen';

const mockNavigate = jest.fn();

jest.mock('@/hooks/useAppTranslation', () => ({
  useAppTranslation: () => ({
    language: 'en',
    isRTL: false,
    t: (key: string, options?: { count?: number }) => {
      const map: Record<string, string> = {
        'profile.title': 'Profile',
        'profile.phone': 'Phone',
        'profile.editProfile': 'Edit profile',
        'profile.saveProfile': 'Save changes',
        'profile.orderHistory': 'My Orders',
        'profile.currentCart': 'Current cart',
        'profile.savedAddresses': 'Saved addresses',
        'profile.savedAddressesEmpty': 'No saved addresses yet',
        'profile.accountStatus': 'Account status',
        'profile.accountStatusActive': 'Active',
        'profile.accountSupportHint': 'Manage your account details, language, and quick shortcuts from one place.',
        'profile.settings': 'Settings',
        'auth.firstName': 'First name',
        'auth.lastName': 'Last name',
        'common.language': 'Language',
        'common.languageEnglish': 'English',
        'common.logout': 'Logout',
        'common.cancel': 'Cancel',
        'common.confirm': 'Confirm',
        'common.remove': 'Remove',
      };
      if (key === 'profile.savedAddressesCount') {
        return `${options?.count ?? 0} saved`;
      }
      return map[key] ?? key;
    },
  }),
}));

jest.mock('@/state/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      first_name: 'Sara',
      last_name: 'Noor',
      phone_number: '+962790000111',
      role: 'CLIENT',
    },
    logout: jest.fn(),
    updateProfile: jest.fn(),
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

jest.mock('@/services/addressBook', () => ({
  addressBook: {
    list: jest.fn().mockResolvedValue([]),
    save: jest.fn(),
    remove: jest.fn(),
  },
}));

describe('ProfileScreen orders shortcut', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to orders from the prominent shortcut', () => {
    const { getAllByText } = render(
      <ProfileScreen navigation={{ navigate: mockNavigate, getParent: () => ({ navigate: mockNavigate }) } as never} route={{} as never} />,
    );

    fireEvent.press(getAllByText('My Orders')[0]);

    expect(mockNavigate).toHaveBeenCalledWith('PastOrders');
  });
});
