const originalConsoleError = console.error;

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockMapView = ({ children }: { children?: unknown }) => React.createElement(View, null, children);
  const MockMarker = () => null;

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
  };
});

jest.mock('expo-notifications', () => {
  return {
    __esModule: true,
    setNotificationHandler: jest.fn(),
    getPermissionsAsync: jest.fn(async () => ({ granted: true })),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
    getDevicePushTokenAsync: jest.fn(async () => ({ data: 'device-token-123' })),
    getLastNotificationResponseAsync: jest.fn(async () => null),
    addNotificationResponseReceivedListener: jest.fn((listener) => {
      return {
        remove: () => listener,
      };
    }),
  };
});

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const text = args.map((value) => String(value)).join(' ');
    const isActWarning = text.includes('not wrapped in act');
    if (isActWarning) {
      return;
    }
    originalConsoleError(...args);
  });
});

afterAll(() => {
  const mocked = console.error as unknown as { mockRestore?: () => void };
  if (typeof mocked.mockRestore === 'function') {
    mocked.mockRestore();
  }
});
