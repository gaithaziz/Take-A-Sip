import { render } from '@testing-library/react-native';

import { AppNavigator } from '@/navigation/AppNavigator';

const mockLoadingState = jest.fn((_: string | undefined) => null);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/state/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    isRTL: false,
    toggleLanguage: jest.fn(),
  }),
}));

jest.mock('@/state/AuthContext', () => ({
  useAuth: () => ({
    token: null,
    user: null,
    isLoading: true,
  }),
}));

jest.mock('@/components/LoadingState', () => ({
  LoadingState: ({ label }: { label?: string }) => mockLoadingState(label),
}));

describe('AppNavigator', () => {
  beforeEach(() => {
    mockLoadingState.mockClear();
  });

  it('renders branded loading state while auth is restoring', () => {
    render(<AppNavigator />);
    expect(mockLoadingState).toHaveBeenCalledWith('Take A Sip');
  });
});
