import { act, render } from '@testing-library/react-native';

import { WelcomeScreen } from '@/screens/WelcomeScreen';

const mockOnContinue = jest.fn();

jest.mock('@/hooks/useAppTranslation', () => ({
  useAppTranslation: () => ({
    language: 'en',
    isRTL: false,
    t: (key: string) => {
      const map: Record<string, string> = {
        'welcome.arabicGreeting': 'أهلاً بك في خذلك شفة',
        'welcome.englishGreeting': 'Welcome to Take A Sip',
        'welcome.poweredBy': 'Powered by Codevex',
        'welcome.poweredByArabic': 'بدعم من Codevex',
      };

      return map[key] ?? key;
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/state/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    isRTL: false,
    toggleLanguage: jest.fn(),
  }),
}));

describe('WelcomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders both logos and bilingual greeting copy', () => {
    const { getByText, getByTestId } = render(
      <WelcomeScreen
        navigation={{ replace: jest.fn() } as never}
        route={{ key: 'Welcome', name: 'Welcome' } as never}
        targetRoute="Auth"
        onContinue={mockOnContinue}
      />,
    );

    expect(getByTestId('welcome-main-logo')).toBeTruthy();
    expect(getByTestId('welcome-codevex-logo')).toBeTruthy();
    expect(getByText('أهلاً بك في خذلك شفة')).toBeTruthy();
    expect(getByText('Welcome to Take A Sip')).toBeTruthy();
    expect(getByText('Powered by')).toBeTruthy();
  });

  it('continues automatically after the welcome delay', () => {
    render(
      <WelcomeScreen
        navigation={{ replace: jest.fn() } as never}
        route={{ key: 'Welcome', name: 'Welcome' } as never}
        targetRoute="Auth"
        onContinue={mockOnContinue}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(mockOnContinue).toHaveBeenCalledTimes(1);
  });
});
