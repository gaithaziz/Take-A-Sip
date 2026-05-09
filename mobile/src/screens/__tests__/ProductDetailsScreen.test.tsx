import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { ProductDetailsScreen } from '@/screens/ProductDetailsScreen';

const mockAddItem = jest.fn();
const mockNavigate = jest.fn();

const item = {
  id: 'item-1',
  section_id: 'section-1',
  name_en: 'Latte',
  name_ar: 'Latte',
  image_url: null,
  description_en: 'Milky coffee',
  description_ar: 'Milky coffee',
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
};

jest.mock('@/hooks/useAppTranslation', () => ({
  useAppTranslation: () => ({
    language: 'en',
    isRTL: false,
    t: (key: string) => {
      const map: Record<string, string> = {
        'common.appName': 'Take A Sip',
        'product.selectType': 'Select type',
        'product.selectSize': 'Select size',
        'product.selectAddons': 'Add-ons',
        'product.addToCart': 'Add to cart',
        'product.addedToCart': 'Added to cart successfully',
      };
      return map[key] ?? key;
    },
  }),
}));

jest.mock('@/state/CartContext', () => ({
  useCart: () => ({
    addItem: mockAddItem,
    items: [],
  }),
}));

jest.mock('@/state/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    isRTL: false,
    toggleLanguage: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('ProductDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddItem.mockReturnValue(true);
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('adds items to cart, shows success, and returns to the previous screen', () => {
    const goBack = jest.fn();
    const { getByText } = render(
      <ProductDetailsScreen
        navigation={{ navigate: mockNavigate, goBack } as never}
        route={{ params: { item } } as never}
      />,
    );

    fireEvent.press(getByText('Add to cart'));

    expect(mockAddItem).toHaveBeenCalledWith({
      item,
      itemType: item.item_types[0],
      size: item.item_types[0].sizes[0],
      addons: [],
      quantity: 1,
    });
    expect(Alert.alert).toHaveBeenCalledWith('Take A Sip', 'Added to cart successfully');
    expect(goBack).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith('Cart');
  });
});
