import { I18nManager } from 'react-native';

import { configureAppLayoutDirection } from '../layoutDirection';

jest.mock('react-native', () => ({
  I18nManager: {
    allowRTL: jest.fn(),
    forceRTL: jest.fn(),
  },
}));

describe('configureAppLayoutDirection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps native layout direction independent from the Android system locale', () => {
    configureAppLayoutDirection();

    expect(I18nManager.allowRTL).toHaveBeenCalledWith(false);
    expect(I18nManager.forceRTL).toHaveBeenCalledWith(false);
  });
});
