import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { ProfileScreen } from '@/screens/ProfileScreen';
import { addressBook } from '@/services/addressBook';

const mockLogout = jest.fn();
const mockUpdateProfile = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@/hooks/useAppTranslation', () => ({
  useAppTranslation: () => ({
    language: 'en',
    isRTL: false,
    t: (key: string) => {
      const map: Record<string, string> = {
        'profile.title': 'Profile',
        'profile.phone': 'Phone',
        'profile.editProfile': 'Edit profile',
        'profile.saveProfile': 'Save changes',
        'profile.accountDetails': 'Account details',
        'profile.quickActions': 'Quick actions',
        'profile.preferences': 'Preferences',
        'profile.accountSafety': 'Account safety',
        'profile.orderHistory': 'Order history',
        'profile.currentCart': 'Current cart',
        'profile.savedAddresses': 'Saved addresses',
        'profile.savedAddressesPlaceholder': 'Manage your saved delivery locations here.',
        'profile.savedAddressesEmpty': 'No saved addresses yet',
        'profile.savedAddressesCount': '1 saved',
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
      };
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
    logout: mockLogout,
    updateProfile: mockUpdateProfile,
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

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    (addressBook.list as jest.Mock).mockResolvedValue([]);
  });

  it('updates profile details from the account hub', async () => {
    mockUpdateProfile.mockResolvedValue(undefined);

    const { getAllByText, getByText, getByDisplayValue } = render(
      <ProfileScreen navigation={{ navigate: mockNavigate, getParent: () => ({ navigate: mockNavigate }) } as never} route={{} as never} />,
    );

    fireEvent.press(getAllByText('Edit profile')[0]);
    fireEvent.changeText(getByDisplayValue('Sara'), 'Sarah');
    fireEvent.changeText(getByDisplayValue('Noor'), 'Nour');
    fireEvent.press(getByText('Save changes'));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({ first_name: 'Sarah', last_name: 'Nour' });
    });
  });

  it('renders the reorganized profile hub sections and quick actions', async () => {
    const { getAllByText, getByText } = render(
      <ProfileScreen navigation={{ navigate: mockNavigate, getParent: () => ({ navigate: mockNavigate }) } as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(getByText('Quick actions')).toBeTruthy();
    });

    expect(getByText('Account details')).toBeTruthy();
    expect(getByText('Preferences')).toBeTruthy();
    expect(getByText('Saved addresses')).toBeTruthy();
    expect(getByText('Account safety')).toBeTruthy();
    expect(getAllByText('Current cart').length).toBeGreaterThan(0);
    expect(getByText('Language')).toBeTruthy();
  });
});
