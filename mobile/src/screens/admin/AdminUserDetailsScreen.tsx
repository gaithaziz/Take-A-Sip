import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppCard } from '@/components/AppCard';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ExpandableText } from '@/components/admin/ExpandableText';
import { InfoLine } from '@/components/admin/InfoLine';
import { RootStackParamList } from '@/navigation/types';
import { adminService } from '@/services/adminService';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { OrderRead } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { formatCurrency, formatDateTimeWithZone, getCurrentTimeZone, toNumber } from '@/utils/format';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { mirroredRow } from '@/utils/layout';

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
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const orderTypeLabel = (orderType: OrderRead['order_type'], t: (key: string) => string): string =>
  orderType === 'pickup' ? t('checkout.pickup') : t('checkout.delivery');

export const AdminUserDetailsScreen = ({ route }: Props) => {
  const { t, language } = useAppTranslation();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRead[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.listUserOrders(user.id);
      setOrders(response.orders);
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
    <AppCard>
      <View style={[styles.orderHeader, mirroredRow(isRTL)]}>
        <AppText variant="h3">#{order.order_number}</AppText>
        <BadgeChip label={t(`status.${order.status}`)} tone={toneByStatus[order.status]} />
      </View>
      <AppText variant="bodySmall" color={theme.colors.textSecondary}>
        {formatDateTimeWithZone(order.created_at, language)}
      </AppText>
      <InfoLine label={t('admin.orderType')} value={orderTypeLabel(order.order_type, t)} numberOfLines={1} />
      <InfoLine label={t('common.total')} value={formatCurrency(getOrderTotal(order), language)} numberOfLines={1} />
      <View style={styles.itemsStack}>
        {order.items.map((item) => (
          <ExpandableText
            key={item.id}
            value={`${item.quantity}x ${item.item_name_snapshot} (${item.size_snapshot})`}
            variant="caption"
            numberOfLines={2}
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
          <AppText variant="h1">{t('admin.userOrdersTitle')}</AppText>
          <AppCard>
            <AppText variant="h3" numberOfLines={2}>{`${user.first_name} ${user.last_name}`}</AppText>
            <InfoLine label={t('profile.phone')} value={user.phone_number} numberOfLines={1} />
            <InfoLine label={t('admin.timeRange')} value={timezone} numberOfLines={1} />
            <View style={[styles.summaryRow, mirroredRow(isRTL)]}>
              <BadgeChip label={`${t('admin.orderCount')}: ${orders.length}`} tone="info" />
              <BadgeChip label={`${t('admin.totalSpent')}: ${formatCurrency(totalSpent, language)}`} tone="success" />
            </View>
          </AppCard>
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <LoadingState label={t('common.loading')} />
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
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  itemsStack: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  separator: {
    height: theme.spacing.md,
  },
});
