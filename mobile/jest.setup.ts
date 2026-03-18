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
