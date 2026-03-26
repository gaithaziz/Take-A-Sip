import { fireEvent, render, waitFor } from '@testing-library/react-native';

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
        'auth.trustMessage': 'We only use your phone number to verify your account and keep your orders secure.',
        'auth.staffHint': 'Staff and admin users must sign in with the exact phone number provisioned for their account.',
        'auth.firstName': 'First name',
        'auth.lastName': 'Last name',
        'auth.phoneNumber': 'Phone number',
        'auth.otpCode': 'OTP code',
        'auth.sendOtp': 'Send OTP',
        'auth.verifyOtp': 'Verify OTP',
        'common.languageArabic': 'Arabic',
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

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('AuthScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows inline validation when required fields are empty', () => {
    const { getByText, getAllByText } = render(<AuthScreen />);

    fireEvent.press(getByText('Send OTP'));

    expect(getAllByText('Please fill all required fields').length).toBeGreaterThan(0);
    expect(mockSendOtp).not.toHaveBeenCalled();
  });

  it('verifies otp without sending an explicit role', async () => {
    mockSendOtp.mockResolvedValue(undefined);
    mockVerifyOtp.mockResolvedValue(undefined);

    const { getByText, getByLabelText } = render(<AuthScreen />);

    fireEvent.changeText(getByLabelText('First name'), 'Ali');
    fireEvent.changeText(getByLabelText('Last name'), 'Sami');
    fireEvent.changeText(getByLabelText('Phone number'), '+962790000111');
    fireEvent.press(getByText('Send OTP'));

    await waitFor(() => {
      expect(mockSendOtp).toHaveBeenCalled();
    });

    fireEvent.changeText(getByLabelText('OTP code'), '1234');
    fireEvent.press(getByText('Verify OTP'));

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        phone_number: '+962790000111',
        otp_code: '1234',
        first_name: 'Ali',
        last_name: 'Sami',
      });
    });
  });
});
