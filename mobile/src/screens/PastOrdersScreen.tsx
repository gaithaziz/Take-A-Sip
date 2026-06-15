import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTranslation } from '@/hooks/useAppTranslation';
import { MainTabParamList } from '@/navigation/types';
import { menuService } from '@/services/menuService';
import { orderService } from '@/services/orderService';
import { useCart } from '@/state/CartContext';
import { useLanguage } from '@/state/LanguageContext';
import { MenuResponse } from '@/types/api';
import { OrderRead } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { buildMenuSnapshotLookup } from '@/utils/orderLocalization';

import { PastOrdersScreenView } from './orders/PastOrdersScreenView';

type Props = BottomTabScreenProps<MainTabParamList, 'PastOrders'>;

export const PastOrdersScreen = ({ navigation }: Props) => {
  const { t, language } = useAppTranslation();
  const { isRTL } = useLanguage();
  const { clearCart, addItem } = useCart();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRead[]>([]);
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const menuSnapshotLookup = useMemo(() => buildMenuSnapshotLookup(menu), [menu]);

  const normalizeSnapshot = (value: string | null | undefined) => (value ?? '').trim().toLowerCase();
  const matchesSnapshotName = (snapshot: string, candidates: Array<string | null | undefined>) => {
    const normalizedSnapshot = normalizeSnapshot(snapshot);
    if (!normalizedSnapshot) {
      return false;
    }
    return candidates.some((candidate) => normalizeSnapshot(candidate) === normalizedSnapshot);
  };

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ordersResult, menuResult] = await Promise.allSettled([
        orderService.getMyLatest(),
        menuService.getMenu(),
      ]);
      if (ordersResult.status === 'rejected') {
        throw ordersResult.reason;
      }
      setOrders(ordersResult.value.orders);
      if (menuResult.status === 'fulfilled') {
        setMenu(menuResult.value);
      }
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const onReorder = async (order: OrderRead) => {
    try {
      setReorderingId(order.id);
      const menu = await menuService.getMenu();
      const activeSections = menu.sections.filter((section) => section.is_active);
      const catalog = activeSections.flatMap((section) =>
        section.items
          .filter((item) => item.is_active)
          .flatMap((item) =>
            item.item_types
              .filter((itemType) => itemType.is_active)
              .flatMap((itemType) =>
                itemType.sizes.filter((size) => size.is_active).map((size) => ({ item, itemType, size })),
              ),
          ),
      );

      const rebuiltLines = order.items.map((line) => {
        const matchedBySnapshotIds =
          line.size_id_snapshot
            ? catalog.find(
                (entry) =>
                  entry.size.id === line.size_id_snapshot &&
                  (!line.item_id_snapshot || entry.item.id === line.item_id_snapshot),
              )
            : null;
        const matchedSize =
          matchedBySnapshotIds ??
          catalog.find(
            (entry) =>
              matchesSnapshotName(line.item_name_snapshot, [entry.item.name_en, entry.item.name_ar]) &&
              matchesSnapshotName(line.size_snapshot, [entry.size.name_en, entry.size.name_ar]),
          );
        if (!matchedSize) {
          return null;
        }

        const matchedAddons = line.addons.map((snapshotAddon) =>
          snapshotAddon.addon_id_snapshot
            ? matchedSize.size.addons.find((addon) => addon.is_active && addon.id === snapshotAddon.addon_id_snapshot)
            : matchedSize.size.addons.find(
                (addon) =>
                  addon.is_active &&
                  matchesSnapshotName(snapshotAddon.addon_name_snapshot, [addon.name_en, addon.name_ar]),
              ),
        );
        if (matchedAddons.some((addon) => !addon)) {
          return null;
        }

        return {
          item: matchedSize.item,
          itemType: matchedSize.itemType,
          size: matchedSize.size,
          addons: matchedAddons.filter((addon): addon is NonNullable<typeof addon> => Boolean(addon)),
          quantity: line.quantity,
        };
      });

      if (rebuiltLines.some((line) => !line)) {
        Alert.alert(t('common.appName'), t('orders.reorderNotPossible'));
        return;
      }

      clearCart();
      for (const line of rebuiltLines) {
        if (!line) {
          continue;
        }
        addItem({
          item: line.item,
          itemType: line.itemType,
          size: line.size,
          addons: line.addons,
          quantity: line.quantity,
        });
      }

      Alert.alert(t('common.appName'), t('orders.reorderPrepared'));
      navigation.getParent()?.navigate('Cart');
    } catch (e) {
      Alert.alert(t('common.appName'), getApiErrorMessage(e, t));
    } finally {
      setReorderingId(null);
    }
  };

  const onOpenDetails = (orderId: string) => {
    navigation.getParent()?.navigate('ClientOrderDetails', { orderId });
  };

  return (
    <PastOrdersScreenView
      title={t('orders.title')}
      loadingLabel={t('common.loading')}
      retryLabel={t('common.retry')}
      emptyTitle={t('orders.emptyTitle')}
      emptySubtitle={t('orders.emptySubtitle')}
      reorderLabel={t('orders.reorder')}
      language={language}
      isRTL={isRTL}
      orders={orders}
      loading={loading}
      error={error}
      reorderingId={reorderingId}
      topInset={insets.top}
      bottomInset={insets.bottom}
      onReload={loadOrders}
      onReorder={(order) => void onReorder(order)}
      onOpenDetails={onOpenDetails}
      menuSnapshotLookup={menuSnapshotLookup}
      t={t}
    />
  );
};
