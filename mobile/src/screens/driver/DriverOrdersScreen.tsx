import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { EmptyState } from '@/components/EmptyState';
import { ListPageSkeleton } from '@/components/skeleton/PageSkeletons';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { DriverTabParamList } from '@/navigation/types';
import { orderService } from '@/services/orderService';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { OrderRead } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { mirroredRow } from '@/utils/layout';

type Props = BottomTabScreenProps<DriverTabParamList, 'DriverOrders'>;

export const DriverOrdersScreen = ({ navigation }: Props) => {
  const { t } = useAppTranslation();
  const { isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRead[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await orderService.getDriverLatest();
      setOrders(data.orders);
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (loading) {
    return <ListPageSkeleton isRTL={isRTL} />;
  }

  if (error) {
    return <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={load} />;
  }

  const activeOrders = orders.filter((order) => order.status === 'ASSIGNED' || order.status === 'OUT_FOR_DELIVERY');
  const completedOrders = orders.filter(
    (order) => order.status === 'DELIVERED' || order.status === 'COMPLETED' || order.status === 'CANCELLED',
  );

  return (
    <AppShell refreshing={loading} onRefresh={load}>
      <AppText variant="h1">{t('driver.ordersTitle')}</AppText>
      {orders.length === 0 ? (
        <EmptyState title={t('driver.noOrdersTitle')} subtitle={t('driver.noOrdersSubtitle')} />
      ) : (
        <View style={styles.list}>
          <AppText variant="h3">{t('driver.activeDeliveries')}</AppText>
          {activeOrders.length === 0 ? (
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {t('driver.noActiveDeliveries')}
            </AppText>
          ) : (
            activeOrders.map((order) => (
              <Pressable
                key={order.id}
                onPress={() => navigation.getParent()?.navigate('DriverOrderDetails', { orderId: order.id } as never)}
                style={({ pressed }) => (pressed ? styles.pressed : null)}
              >
                <AppCard style={styles.card}>
                  <View style={[styles.row, mirroredRow(isRTL)]}>
                    <AppText variant="h3">#{order.order_number}</AppText>
                    <BadgeChip label={t(`status.${order.status}`)} tone="warning" />
                  </View>
                  <AppText>{order.customer_name ?? '-'}</AppText>
                  <AppText color={theme.colors.textSecondary}>{order.customer_phone ?? '-'}</AppText>
                  <AppText color={theme.colors.textSecondary} numberOfLines={2}>
                    {order.delivery_address_text || order.delivery_address || '-'}
                  </AppText>
                </AppCard>
              </Pressable>
            ))
          )}

          <AppText variant="h3">{t('driver.completedDeliveries')}</AppText>
          {completedOrders.length === 0 ? (
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {t('driver.noCompletedDeliveries')}
            </AppText>
          ) : (
            completedOrders.map((order) => (
              <Pressable
                key={order.id}
                onPress={() => navigation.getParent()?.navigate('DriverOrderDetails', { orderId: order.id } as never)}
                style={({ pressed }) => (pressed ? styles.pressed : null)}
              >
                <AppCard style={styles.card}>
                  <View style={[styles.row, mirroredRow(isRTL)]}>
                    <AppText variant="h3">#{order.order_number}</AppText>
                    <BadgeChip
                      label={t(`status.${order.status}`)}
                      tone={order.status === 'CANCELLED' ? 'error' : 'success'}
                    />
                  </View>
                  <AppText>{order.customer_name ?? '-'}</AppText>
                  <AppText color={theme.colors.textSecondary}>{order.customer_phone ?? '-'}</AppText>
                  <AppText color={theme.colors.textSecondary} numberOfLines={2}>
                    {order.delivery_address_text || order.delivery_address || '-'}
                  </AppText>
                </AppCard>
              </Pressable>
            ))
          )}
        </View>
      )}
    </AppShell>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing.md,
  },
  card: {
    gap: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
});
