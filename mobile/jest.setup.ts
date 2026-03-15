const originalConsoleError = console.error;

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
