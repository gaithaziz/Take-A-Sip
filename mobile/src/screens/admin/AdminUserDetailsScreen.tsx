import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { EmptyState } from '@/components/EmptyState';
import { ListPageSkeleton } from '@/components/skeleton/PageSkeletons';
import { ExpandableText } from '@/components/admin/ExpandableText';
import { InfoLine } from '@/components/admin/InfoLine';
import { RootStackParamList } from '@/navigation/types';
import { adminService } from '@/services/adminService';
import { menuService } from '@/services/menuService';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { MenuResponse, OrderRead } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { formatCurrency, formatDateTimeWithZone, getCurrentTimeZone, toNumber } from '@/utils/format';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { mirroredRow } from '@/utils/layout';
import {
  buildMenuSnapshotLookup,
  getLocalizedOrderLineLabel,
} from '@/utils/orderLocalization';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminUserDetails'>;

const getOrderTotal = (order: OrderRead): number => {
  return order.items.reduce((sum, item) => {
    const addons = item.addons.reduce((addonSum, addon) => addonSum + toNumber(addon.price_snapshot), 0);
    return sum + (toNumber(item.price_snapshot) + addons) * item.quantity;
  }, 0);
};

const toneByStatus: Record<OrderRead['status'], 'info' | 'success' | 'warning' | 'error'> = {
  NEW: 'warning',
  ACCEPTED: 'info',
  ASSIGNED: 'info',
  OUT_FOR_DELIVERY: 'info',
  DELIVERED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const orderTypeLabel = (orderType: OrderRead['order_type'], t: (key: string) => string): string =>
  orderType === 'pickup' ? t('checkout.pickup') : t('checkout.delivery');

export const AdminUserDetailsScreen = ({ route, navigation }: Props) => {
  const { t, language } = useAppTranslation();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRead[]>([]);
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const menuSnapshotLookup = useMemo(() => buildMenuSnapshotLookup(menu), [menu]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ordersResult, menuResult] = await Promise.allSettled([
        adminService.listUserOrders(user.id),
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
  }, [t, user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalSpent = useMemo(() => orders.reduce((sum, order) => sum + getOrderTotal(order), 0), [orders]);
  const timezone = getCurrentTimeZone();

  const renderOrder = ({ item: order }: { item: OrderRead }) => (
    <AppCard style={styles.orderCard}>
      <View style={[styles.orderHeader, mirroredRow(isRTL)]}>
        <AppText variant="h3">#{order.order_number}</AppText>
        <BadgeChip label={t(`status.${order.status}`)} tone={toneByStatus[order.status]} />
      </View>
      <View style={[styles.metaRow, mirroredRow(isRTL)]}>
        <BadgeChip label={orderTypeLabel(order.order_type, t)} tone="info" />
        <BadgeChip label={formatCurrency(getOrderTotal(order), language)} tone="success" />
      </View>
      <AppText variant="bodySmall" color={theme.colors.textSecondary} numberOfLines={2}>
        {formatDateTimeWithZone(order.created_at, language)}
      </AppText>
      <View style={styles.itemsStack}>
        {order.items.map((item) => (
          <ExpandableText
            key={item.id}
            value={getLocalizedOrderLineLabel(item, menuSnapshotLookup, language)}
            variant="caption"
            numberOfLines={1}
            color={theme.colors.textSecondary}
          />
        ))}
      </View>
    </AppCard>
  );

  return (
    <FlatList
      data={loading || error ? [] : orders}
      keyExtractor={(order) => order.id}
      renderItem={renderOrder}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <AppButton title={t('common.goBack')} variant="ghost" fullWidth={false} onPress={() => navigation.goBack()} />
          <AppText variant="h1">{t('admin.userOrdersTitle')}</AppText>
          <AppCard style={styles.userSummaryCard}>
            <View style={[styles.userSummaryHeader, mirroredRow(isRTL)]}>
              <AppText variant="h3" numberOfLines={2}>{`${user.first_name} ${user.last_name}`}</AppText>
              <BadgeChip label={user.is_banned ? t('admin.banned') : t('admin.active')} tone={user.is_banned ? 'error' : 'success'} />
            </View>
            <View style={styles.userInfoBox}>
              <InfoLine label={t('profile.phone')} value={user.phone_number} numberOfLines={1} />
              <InfoLine label={t('admin.timeRange')} value={timezone} numberOfLines={1} />
            </View>
            <View style={[styles.summaryRow, mirroredRow(isRTL)]}>
              <BadgeChip label={`${t('admin.orderCount')}: ${orders.length}`} tone="info" />
              <BadgeChip label={`${t('admin.totalSpent')}: ${formatCurrency(totalSpent, language)}`} tone="success" />
            </View>
          </AppCard>
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <ListPageSkeleton isRTL={isRTL} shell={false} cards={3} />
        ) : error ? (
          <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={load} />
        ) : (
          <EmptyState title={t('admin.noUserOrdersTitle')} subtitle={t('admin.noUserOrdersSubtitle')} />
        )
      }
      refreshing={loading}
      onRefresh={load}
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
  content: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
  },
  headerBlock: {
    marginBottom: theme.spacing.md,
    gap: theme.spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  userSummaryCard: {
    gap: theme.spacing.md,
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
  },
  userSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  userInfoBox: {
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
  },
  orderCard: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  itemsStack: {
    marginTop: theme.spacing.xs,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  separator: {
    height: theme.spacing.md,
  },
});
