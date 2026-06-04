import { ScrollView, StyleSheet } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { HomeScreen } from '@/screens/HomeScreen';
import { menuService } from '@/services/menuService';
import { promotionService } from '@/services/promotionService';

const mockNavigate = jest.fn();
const mockCartItems = [{ quantity: 2 }];

const menuResponse = {
  sections: [
    {
      id: 'section-1',
      name_en: 'Coffee',
      name_ar: 'Coffee',
      image_url: null,
      is_active: true,
      sort_order: 1,
      items: [
        {
          id: 'item-1',
          section_id: 'section-1',
          name_en: 'Latte',
          name_ar: 'Latte',
          image_url: null,
          description_en: 'Hot drinks',
          description_ar: 'Hot drinks',
          sort_order: 1,
          is_active: true,
          item_types: [
            {
              id: 'type-1',
              item_id: 'item-1',
              name_en: 'Hot',
              name_ar: 'Hot',
              image_url: null,
              sort_order: 1,
              is_active: true,
              sizes: [
                {
                  id: 'size-1',
                  type_id: 'type-1',
                  name_en: 'Regular',
                  name_ar: 'Regular',
                  image_url: null,
                  price: '3.50',
                  sort_order: 1,
                  is_active: true,
                  addons: [],
                },
              ],
            },
          ],
        },
        {
          id: 'item-2',
          section_id: 'section-1',
          name_en: 'Cappuccino',
          name_ar: 'Cappuccino',
          image_url: null,
          description_en: 'Hot drinks',
          description_ar: 'Hot drinks',
          sort_order: 2,
          is_active: true,
          item_types: [
            {
              id: 'type-2',
              item_id: 'item-2',
              name_en: 'Hot',
              name_ar: 'Hot',
              image_url: null,
              sort_order: 1,
              is_active: true,
              sizes: [
                {
                  id: 'size-2',
                  type_id: 'type-2',
                  name_en: 'Regular',
                  name_ar: 'Regular',
                  image_url: null,
                  price: '4.00',
                  sort_order: 1,
                  is_active: true,
                  addons: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const t = (key: string) => {
  const map: Record<string, string> = {
    'common.appName': 'Take A Sip',
    'common.retry': 'Retry',
    'home.title': 'Menu',
    'home.cart': 'Cart',
    'home.completeOrder': 'Complete order',
    'home.noMenu': 'No menu available right now',
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
    items: mockCartItems,
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
  beforeEach(() => {
    jest.clearAllMocks();
    (menuService.getMenu as jest.Mock).mockResolvedValue(menuResponse);
    (promotionService.getActive as jest.Mock).mockResolvedValue({ promotions: [] });
  });

  it('renders no menu empty state', async () => {
    (menuService.getMenu as jest.Mock).mockResolvedValue({ sections: [] });

    const { getAllByText } = render(
      <HomeScreen navigation={{ getParent: () => ({ navigate: mockNavigate }) } as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(getAllByText('No menu available right now').length).toBeGreaterThan(0);
    });
  });

  it('shows collapsed sections, expands subgroup rows, opens products, and routes both cart actions to cart', async () => {
    const { UNSAFE_getByType, getAllByText, getByTestId, getByText, queryByText } = render(
      <HomeScreen navigation={{ getParent: () => ({ navigate: mockNavigate }) } as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(getByText('Coffee')).toBeTruthy();
    });

    const scrollView = UNSAFE_getByType(ScrollView);
    const contentStyle = StyleSheet.flatten(scrollView.props.contentContainerStyle);
    expect(contentStyle.paddingBottom).toBe(66);
    expect(queryByText('2 items')).toBeNull();

    expect(queryByText('Latte')).toBeNull();
    expect(queryByText('Cappuccino')).toBeNull();

    fireEvent.press(getByTestId('section-row-section-1'));
    expect(getAllByText('Hot drinks').length).toBeGreaterThan(0);
    expect(queryByText('Latte')).toBeNull();
    expect(queryByText('Cappuccino')).toBeNull();

    fireEvent.press(getByTestId('subgroup-row-section-1-Hot drinks'));
    expect(getByText('Latte')).toBeTruthy();
    expect(getByText('Cappuccino')).toBeTruthy();

    fireEvent.press(getByText('Latte'));
    expect(mockNavigate).toHaveBeenCalledWith('ProductDetails', { item: menuResponse.sections[0].items[0] });

    fireEvent.press(getByTestId('home-cart-button'));
    expect(mockNavigate).toHaveBeenCalledWith('Cart');

    fireEvent.press(getByTestId('home-complete-order-button'));
    expect(mockNavigate).toHaveBeenCalledWith('Cart');

    fireEvent.press(getByTestId('subgroup-row-section-1-Hot drinks'));
    await waitFor(() => {
      expect(queryByText('Latte')).toBeNull();
    });

    fireEvent.press(getByTestId('section-row-section-1'));
    await waitFor(() => {
      expect(queryByText('Hot drinks')).toBeNull();
    });
  });
});
