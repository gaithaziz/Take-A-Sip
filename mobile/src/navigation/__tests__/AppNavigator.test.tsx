import { act, render } from '@testing-library/react-native';

import { AppNavigator } from '@/navigation/AppNavigator';

const mockLoadingState = jest.fn((_: string | undefined) => null);
const authState = {
  token: null as string | null,
  user: null as { role: 'CLIENT' | 'ADMIN' | 'DRIVER' } | null,
  isLoading: true,
};

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

jest.mock('@/hooks/useAppTranslation', () => ({
  useAppTranslation: () => ({
    language: 'en',
    isRTL: false,
    t: (key: string) => {
      const map: Record<string, string> = {
        'common.appName': 'Take A Sip',
        'welcome.arabicGreeting': 'أهلاً بك في خذلك شفة',
        'welcome.englishGreeting': 'Welcome to Take A Sip',
        'welcome.poweredBy': 'Powered by Codevex',
        'welcome.poweredByArabic': 'بدعم من Codevex',
      };

      return map[key] ?? key;
    },
  }),
}));

jest.mock('@/state/AuthContext', () => ({
  useAuth: () => authState,
}));

jest.mock('@/components/LoadingState', () => ({
  LoadingState: ({ label }: { label?: string }) => mockLoadingState(label),
}));

jest.mock('@/screens/AuthScreen', () => ({
  AuthScreen: () => {
    const { Text } = require('react-native');
    return <Text>Auth Screen</Text>;
  },
}));

jest.mock('@/screens/HomeScreen', () => ({
  HomeScreen: () => {
    const { Text } = require('react-native');
    return <Text>Home Screen</Text>;
  },
}));

jest.mock('@/screens/PastOrdersScreen', () => ({
  PastOrdersScreen: () => {
    const { Text } = require('react-native');
    return <Text>Past Orders Screen</Text>;
  },
}));

jest.mock('@/screens/ProfileScreen', () => ({
  ProfileScreen: () => {
    const { Text } = require('react-native');
    return <Text>Profile Screen</Text>;
  },
}));

jest.mock('@/screens/admin/AdminDashboardScreen', () => ({
  AdminDashboardScreen: () => {
    const { Text } = require('react-native');
    return <Text>Admin Dashboard Screen</Text>;
  },
}));

jest.mock('@/screens/admin/AdminMenuEditorScreen', () => ({
  AdminMenuEditorScreen: () => {
    const { Text } = require('react-native');
    return <Text>Admin Menu Screen</Text>;
  },
}));

jest.mock('@/screens/admin/AdminPromotionsScreen', () => ({
  AdminPromotionsScreen: () => {
    const { Text } = require('react-native');
    return <Text>Admin Promotions Screen</Text>;
  },
}));

jest.mock('@/screens/admin/AdminSchedulingScreen', () => ({
  AdminSchedulingScreen: () => {
    const { Text } = require('react-native');
    return <Text>Admin Scheduling Screen</Text>;
  },
}));

jest.mock('@/screens/admin/AdminStaffScreen', () => ({
  AdminStaffScreen: () => {
    const { Text } = require('react-native');
    return <Text>Admin Staff Screen</Text>;
  },
}));

jest.mock('@/screens/admin/AdminUsersScreen', () => ({
  AdminUsersScreen: () => {
    const { Text } = require('react-native');
    return <Text>Admin Users Screen</Text>;
  },
}));

jest.mock('@/screens/admin/AdminDeliveryScreen', () => ({
  AdminDeliveryScreen: () => {
    const { Text } = require('react-native');
    return <Text>Admin Delivery Screen</Text>;
  },
}));

jest.mock('@/screens/driver/DriverOrdersScreen', () => ({
  DriverOrdersScreen: () => {
    const { Text } = require('react-native');
    return <Text>Driver Orders Screen</Text>;
  },
}));

jest.mock('@/screens/driver/DriverProfileScreen', () => ({
  DriverProfileScreen: () => {
    const { Text } = require('react-native');
    return <Text>Driver Profile Screen</Text>;
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('AppNavigator', () => {
  beforeEach(() => {
    mockLoadingState.mockClear();
    authState.token = null;
    authState.user = null;
    authState.isLoading = true;
    jest.useRealTimers();
  });

  it('renders branded loading state while auth is restoring', () => {
    render(<AppNavigator />);
    expect(mockLoadingState).toHaveBeenCalledWith('Take A Sip');
  });

  it('renders welcome first once auth restoration finishes', () => {
    authState.isLoading = false;

    const { getByText } = render(<AppNavigator />);

    expect(getByText('Welcome to Take A Sip')).toBeTruthy();
  });

  it('routes signed-out users to auth after the welcome delay', () => {
    jest.useFakeTimers();
    authState.isLoading = false;

    const { getByText } = render(<AppNavigator />);

    expect(getByText('Welcome to Take A Sip')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(getByText('Auth Screen')).toBeTruthy();
  });

  it('routes signed-in clients to main tabs after the welcome delay', () => {
    jest.useFakeTimers();
    authState.isLoading = false;
    authState.token = 'token';
    authState.user = { role: 'CLIENT' };

    const { getByText } = render(<AppNavigator />);

    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(getByText('Home Screen')).toBeTruthy();
  });

  it('routes signed-in admins to admin tabs after the welcome delay', () => {
    jest.useFakeTimers();
    authState.isLoading = false;
    authState.token = 'token';
    authState.user = { role: 'ADMIN' };

    const { getByText } = render(<AppNavigator />);

    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(getByText('Admin Dashboard Screen')).toBeTruthy();
  });

  it('routes signed-in drivers to driver tabs after the welcome delay', () => {
    jest.useFakeTimers();
    authState.isLoading = false;
    authState.token = 'token';
    authState.user = { role: 'DRIVER' };

    const { getByText } = render(<AppNavigator />);

    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(getByText('Driver Orders Screen')).toBeTruthy();
  });
});
