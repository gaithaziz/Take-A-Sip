import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { MainTabParamList } from '@/navigation/types';
import { menuService } from '@/services/menuService';
import { orderService } from '@/services/orderService';
import { useCart } from '@/state/CartContext';
import { theme } from '@/theme';
import { OrderRead } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { formatDateTime } from '@/utils/format';

const statusToneMap = {
  NEW: 'warning',
  ACCEPTED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'error',
} as const;

type Props = BottomTabScreenProps<MainTabParamList, 'PastOrders'>;

export const PastOrdersScreen = ({ navigation }: Props) => {
  const { t, language } = useAppTranslation();
  const { clearCart, addItem } = useCart();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await orderService.getMyOrders();
      setOrders(data.orders);
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

  const renderOrder = ({ item: order }: { item: OrderRead }) => (
    <AppCard>
      <View style={styles.top}>
        <AppText variant="h3">#{order.order_number}</AppText>
        <BadgeChip label={t(`status.${order.status}`)} tone={statusToneMap[order.status]} />
      </View>
      <AppText variant="caption" color={theme.colors.textSecondary}>
        {formatDateTime(order.created_at, language)}
      </AppText>
      <View style={styles.items}>
        {order.items.slice(0, 3).map((orderItem) => (
          <AppText key={orderItem.id} variant="bodySmall">
            {orderItem.quantity}x {orderItem.item_name_snapshot} ({orderItem.size_snapshot})
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
  );

  return (
    <FlatList
      data={loading || error ? [] : orders}
      keyExtractor={(order) => order.id}
      renderItem={renderOrder}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <AppText variant="h1">{t('orders.title')}</AppText>
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <LoadingState label={t('common.loading')} />
        ) : error ? (
          <EmptyState title={t('common.retry')} subtitle={error} actionLabel={t('common.retry')} onAction={loadOrders} />
        ) : (
          <EmptyState title={t('orders.emptyTitle')} subtitle={t('orders.emptySubtitle')} />
        )
      }
      refreshing={loading}
      onRefresh={loadOrders}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + theme.spacing.md,
          paddingBottom: insets.bottom + theme.spacing.xl,
        },
      ]}
    />
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
  content: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.lg,
  },
  separator: {
    height: theme.spacing.md,
  },
});
