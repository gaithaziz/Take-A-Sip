const originalConsoleError = console.error;
const readableStreamPrototype = globalThis.ReadableStream?.prototype as
  | { cancel?: (reason?: unknown) => Promise<unknown> }
  | undefined;

jest.mock('expo-secure-store', () => ({
  isAvailableAsync: jest.fn(async () => true),
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

if (typeof readableStreamPrototype?.cancel === 'function') {
  readableStreamPrototype.cancel = function patchedCancel() {
    return Promise.resolve(undefined);
  };
}

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
    const isExpectedErrorBoundaryProbe = text.includes('hidden render failure') || text.includes('App render failed');
    if (isActWarning || isExpectedErrorBoundaryProbe) {
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
