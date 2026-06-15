import { MenuResponse, OrderItemRead } from '@/types/api';

import {
  buildMenuSnapshotLookup,
  getLocalizedOrderItemName,
  getLocalizedOrderLineLabel,
  getLocalizedOrderSizeName,
} from '../orderLocalization';

const menu: MenuResponse = {
  sections: [
    {
      id: 'section-1',
      name_en: 'Coffee',
      name_ar: 'قهوة',
      image_url: null,
      is_active: true,
      sort_order: 0,
      items: [
        {
          id: 'item-1',
          section_id: 'section-1',
          name_en: 'Latte',
          name_ar: 'لاتيه',
          image_url: null,
          description_en: null,
          description_ar: null,
          sort_order: 0,
          is_active: true,
          item_types: [
            {
              id: 'type-1',
              item_id: 'item-1',
              name_en: 'Hot',
              name_ar: 'ساخن',
              image_url: null,
              sort_order: 0,
              is_active: true,
              sizes: [
                {
                  id: 'size-1',
                  type_id: 'type-1',
                  name_en: 'Large',
                  name_ar: 'كبير',
                  image_url: null,
                  price: '3.50',
                  sort_order: 0,
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

const orderItem: OrderItemRead = {
  id: 'line-1',
  item_id_snapshot: 'item-1',
  size_id_snapshot: 'size-1',
  item_name_snapshot: 'Latte',
  size_snapshot: 'Large',
  price_snapshot: '3.50',
  quantity: 2,
  addons: [],
};

describe('orderLocalization', () => {
  it('uses Arabic menu names instead of English order snapshots when IDs match', () => {
    const lookup = buildMenuSnapshotLookup(menu);

    expect(getLocalizedOrderItemName(orderItem, lookup, 'ar')).toBe('لاتيه');
    expect(getLocalizedOrderSizeName(orderItem, lookup, 'ar')).toBe('كبير');
    expect(getLocalizedOrderLineLabel(orderItem, lookup, 'ar')).toBe('2x لاتيه (كبير)');
  });

  it('falls back to stored snapshots when menu entities are unavailable', () => {
    const lookup = buildMenuSnapshotLookup(null);

    expect(getLocalizedOrderLineLabel(orderItem, lookup, 'ar')).toBe('2x Latte (Large)');
  });
});
