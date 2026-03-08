import { fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { AuthScreen } from '@/screens/AuthScreen';

const mockSendOtp = jest.fn();
const mockVerifyOtp = jest.fn();

jest.mock('@/hooks/useAppTranslation', () => ({
  useAppTranslation: () => ({
    language: 'en',
    isRTL: false,
    t: (key: string) => {
      const map: Record<string, string> = {
        'common.error': 'Error',
        'validation.requiredFields': 'Please fill all required fields',
        'auth.title': 'Welcome',
        'auth.subtitle': 'Sign in with your phone number',
        'auth.firstName': 'First name',
        'auth.lastName': 'Last name',
        'auth.phoneNumber': 'Phone number',
        'auth.sendOtp': 'Send OTP',
      };
      return map[key] ?? key;
    },
  }),
}));

jest.mock('@/state/AuthContext', () => ({
  useAuth: () => ({
    sendOtp: mockSendOtp,
    verifyOtp: mockVerifyOtp,
  }),
}));

jest.mock('@/state/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    isRTL: false,
    toggleLanguage: jest.fn(),
  }),
}));

jest.mock('@/components/AppShell', () => ({
  AppShell: ({ children }: { children: any }) => children,
}));

describe('AuthScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('shows validation alert when required fields are empty', () => {
    const { getByText } = render(<AuthScreen />);

    fireEvent.press(getByText('Send OTP'));

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill all required fields');
    expect(mockSendOtp).not.toHaveBeenCalled();
  });
});
