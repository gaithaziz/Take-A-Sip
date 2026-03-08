import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { MainTabParamList } from '@/navigation/types';
import { menuService } from '@/services/menuService';
import { orderService } from '@/services/orderService';
import { useAuth } from '@/state/AuthContext';
import { useCart } from '@/state/CartContext';
import { theme } from '@/theme';
import { OrderRead } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';

const statusToneMap = {
  NEW: 'warning',
  ACCEPTED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'error',
} as const;

type Props = BottomTabScreenProps<MainTabParamList, 'PastOrders'>;

export const PastOrdersScreen = ({ navigation }: Props) => {
  const { t } = useAppTranslation();
  const { user } = useAuth();
  const { clearCart, addItem } = useCart();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!user) {
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await orderService.getUserOrders(user.id);
      setOrders(data.orders);
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }, [t, user]);

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
        const matchedSize = catalog.find(
          (entry) => entry.item.name_en === line.item_name_snapshot && entry.size.name_en === line.size_snapshot,
        );
        if (!matchedSize) {
          return null;
        }

        const matchedAddons = line.addons.map((snapshotAddon) =>
          matchedSize.size.addons.find(
            (addon) => addon.is_active && addon.name_en === snapshotAddon.addon_name_snapshot,
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

  return (
    <AppShell refreshing={loading} onRefresh={loadOrders}>
      <AppText variant="h1">{t('orders.title')}</AppText>
      {loading ? <LoadingState label={t('common.loading')} /> : null}
      {!loading && error ? (
        <EmptyState title={t('common.retry')} subtitle={error} actionLabel={t('common.retry')} onAction={loadOrders} />
      ) : null}
      {!loading && !error && orders.length === 0 ? (
        <EmptyState title={t('orders.emptyTitle')} subtitle={t('orders.emptySubtitle')} />
      ) : null}
      {!loading &&
        !error &&
        orders.map((order) => (
          <AppCard key={order.id}>
            <View style={styles.top}>
              <AppText variant="h3">#{order.order_number}</AppText>
              <BadgeChip label={t(`status.${order.status}`)} tone={statusToneMap[order.status]} />
            </View>
            <AppText variant="caption" color={theme.colors.textSecondary}>
              {new Date(order.created_at).toLocaleString()}
            </AppText>
            <View style={styles.items}>
              {order.items.slice(0, 3).map((item) => (
                <AppText key={item.id} variant="bodySmall">
                  {item.quantity}x {item.item_name_snapshot} ({item.size_snapshot})
                </AppText>
              ))}
            </View>
            <AppButton
              title={t('orders.reorder')}
              variant="secondary"
              loading={reorderingId === order.id}
              onPress={() => void onReorder(order)}
            />
          </AppCard>
        ))}
    </AppShell>
  );
};

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  items: {
    marginVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
});
