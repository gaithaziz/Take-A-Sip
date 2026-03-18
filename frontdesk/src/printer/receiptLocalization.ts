import { MenuResponse } from '@/types/api';

export type ReceiptArabicLookup = {
  itemNamesById: Record<string, string>;
  sizeNamesById: Record<string, string>;
  addonNamesById: Record<string, string>;
};

export const emptyReceiptArabicLookup: ReceiptArabicLookup = {
  itemNamesById: {},
  sizeNamesById: {},
  addonNamesById: {},
};

export const buildReceiptArabicLookup = (menu: MenuResponse): ReceiptArabicLookup => {
  const itemNamesById: Record<string, string> = {};
  const sizeNamesById: Record<string, string> = {};
  const addonNamesById: Record<string, string> = {};

  menu.sections.forEach((section) => {
    section.items.forEach((item) => {
      itemNamesById[item.id] = item.name_ar || item.name_en;
      item.item_types.forEach((itemType) => {
        itemType.sizes.forEach((size) => {
          sizeNamesById[size.id] = size.name_ar || size.name_en;
          size.addons.forEach((addon) => {
            addonNamesById[addon.id] = addon.name_ar || addon.name_en;
          });
        });
      });
    });
  });

  return { itemNamesById, sizeNamesById, addonNamesById };
};
