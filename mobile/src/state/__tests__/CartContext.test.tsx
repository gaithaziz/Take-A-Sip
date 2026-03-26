import { PropsWithChildren } from 'react';
import { act, renderHook } from '@testing-library/react-native';

import { CartProvider, useCart } from '@/state/CartContext';

const authState = {
  user: { id: 'user-1' },
};

jest.mock('@/state/AuthContext', () => ({
  useAuth: () => authState,
}));

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

describe('CartContext', () => {
  beforeEach(() => {
    authState.user = { id: 'user-1' };
  });

  it('clears the cart when the authenticated user changes', () => {
    const wrapper = ({ children }: PropsWithChildren) => <CartProvider>{children}</CartProvider>;
    const { result, rerender } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({
        item,
        itemType: item.item_types[0],
        size: item.item_types[0].sizes[0],
        addons: [],
        quantity: 1,
      });
    });

    expect(result.current.items).toHaveLength(1);

    authState.user = { id: 'user-2' };
    rerender({});

    expect(result.current.items).toHaveLength(0);
  });
});
