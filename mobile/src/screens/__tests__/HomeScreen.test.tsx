import { render, waitFor } from '@testing-library/react-native';

import { HomeScreen } from '@/screens/HomeScreen';
import { menuService } from '@/services/menuService';
import { promotionService } from '@/services/promotionService';

const t = (key: string) => {
  const map: Record<string, string> = {
    'home.title': 'Menu',
    'home.cart': 'Cart',
    'home.myOrders': 'My Orders',
    'home.noMenu': 'No menu available right now',
    'common.loading': 'Loading...',
  };
  return map[key] ?? key;
};

jest.mock('@/hooks/useAppTranslation', () => ({
  useAppTranslation: () => ({
    language: 'en',
    isRTL: false,
    t,
  }),
}));

jest.mock('@/state/CartContext', () => ({
  useCart: () => ({
    items: [],
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/state/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    isRTL: false,
    toggleLanguage: jest.fn(),
  }),
}));

jest.mock('@/services/menuService', () => ({
  menuService: {
    getMenu: jest.fn(),
  },
}));

jest.mock('@/services/promotionService', () => ({
  promotionService: {
    getActive: jest.fn(),
  },
}));

describe('HomeScreen', () => {
  it('renders no menu empty state', async () => {
    (menuService.getMenu as jest.Mock).mockResolvedValue({ sections: [] });
    (promotionService.getActive as jest.Mock).mockResolvedValue({ promotions: [] });

    const { getAllByText } = render(
      <HomeScreen navigation={{ getParent: () => ({ navigate: jest.fn() }) } as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(getAllByText('No menu available right now').length).toBeGreaterThan(0);
    });
  });
});
