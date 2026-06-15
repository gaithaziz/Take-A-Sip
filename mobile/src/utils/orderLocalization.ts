import { LanguageCode, MenuResponse, OrderItemAddonRead, OrderItemRead } from '@/types/api';

import { getLocalizedValue } from './i18n';

export type MenuSnapshotLookup = {
  itemNames: Map<string, { name_en?: string | null; name_ar?: string | null }>;
  sizeNames: Map<string, { name_en?: string | null; name_ar?: string | null }>;
  addonNames: Map<string, { name_en?: string | null; name_ar?: string | null }>;
};

export const buildMenuSnapshotLookup = (menu: MenuResponse | null): MenuSnapshotLookup => {
  const itemNames = new Map<string, { name_en?: string | null; name_ar?: string | null }>();
  const sizeNames = new Map<string, { name_en?: string | null; name_ar?: string | null }>();
  const addonNames = new Map<string, { name_en?: string | null; name_ar?: string | null }>();

  for (const section of menu?.sections ?? []) {
    for (const item of section.items) {
      itemNames.set(item.id, item);
      for (const itemType of item.item_types) {
        for (const size of itemType.sizes) {
          sizeNames.set(size.id, size);
          for (const addon of size.addons) {
            addonNames.set(addon.id, addon);
          }
        }
      }
    }
  }

  return { itemNames, sizeNames, addonNames };
};

export const getLocalizedOrderItemName = (
  item: OrderItemRead,
  lookup: MenuSnapshotLookup,
  language: LanguageCode,
) => {
  const menuItem = item.item_id_snapshot ? lookup.itemNames.get(item.item_id_snapshot) : undefined;
  return menuItem ? getLocalizedValue(menuItem, language, 'name') || item.item_name_snapshot : item.item_name_snapshot;
};

export const getLocalizedOrderSizeName = (
  item: OrderItemRead,
  lookup: MenuSnapshotLookup,
  language: LanguageCode,
) => {
  const menuSize = item.size_id_snapshot ? lookup.sizeNames.get(item.size_id_snapshot) : undefined;
  return menuSize ? getLocalizedValue(menuSize, language, 'name') || item.size_snapshot : item.size_snapshot;
};

export const getLocalizedOrderAddonName = (
  addon: OrderItemAddonRead,
  lookup: MenuSnapshotLookup,
  language: LanguageCode,
) => {
  const menuAddon = addon.addon_id_snapshot ? lookup.addonNames.get(addon.addon_id_snapshot) : undefined;
  return menuAddon ? getLocalizedValue(menuAddon, language, 'name') || addon.addon_name_snapshot : addon.addon_name_snapshot;
};

export const getLocalizedOrderLineLabel = (
  item: OrderItemRead,
  lookup: MenuSnapshotLookup,
  language: LanguageCode,
) => {
  const itemName = getLocalizedOrderItemName(item, lookup, language);
  const sizeName = getLocalizedOrderSizeName(item, lookup, language);
  return `${item.quantity}x ${itemName} (${sizeName})`;
};
