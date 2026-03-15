import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { RootStackParamList } from '@/navigation/types';
import { orderService } from '@/services/orderService';
import { theme } from '@/theme';
import { OrderRead } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverOrderDetails'>;

export const DriverOrderDetailsScreen = ({ route }: Props) => {
  const { t } = useAppTranslation();
  const [order, setOrder] = useState<OrderRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await orderService.getById(route.params.orderId);
      setOrder(data);
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }, [route.params.orderId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const mapsUrl = useMemo(() => {
    if (!order) {
      return null;
    }
    if (order.delivery_latitude && order.delivery_longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${order.delivery_latitude},${order.delivery_longitude}`;
    }
    if (order.delivery_address_text || order.delivery_address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        order.delivery_address_text || order.delivery_address || '',
      )}`;
    }
    return null;
  }, [order]);

  const updateStatus = useCallback(
    async (status: 'OUT_FOR_DELIVERY' | 'COMPLETED') => {
      if (!order) {
        return;
      }
      try {
        setStatusLoading(true);
        await orderService.updateStatus(order.id, status);
        await load();
      } catch (e) {
        Alert.alert(t('common.appName'), getApiErrorMessage(e, t));
      } finally {
        setStatusLoading(false);
      }
    },
    [load, order, t],
  );

  if (loading) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (error || !order) {
    return <EmptyState title={t('common.error')} subtitle={error ?? t('errors.generic')} actionLabel={t('common.retry')} onAction={load} />;
  }

  return (
    <AppShell>
      <AppText variant="h1">#{order.order_number}</AppText>
      <AppCard style={styles.block}>
        <AppText variant="h3">{order.customer_name ?? '-'}</AppText>
        <AppText color={theme.colors.textSecondary}>{order.customer_phone ?? '-'}</AppText>
        <AppText>{order.delivery_address_text || order.delivery_address || '-'}</AppText>
      </AppCard>
      <AppCard style={styles.block}>
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          {t('driver.items')}
        </AppText>
        {order.items.map((item) => (
          <AppText key={item.id}>
            {item.quantity}x {item.item_name_snapshot} ({item.size_snapshot})
          </AppText>
        ))}
      </AppCard>
      <View style={styles.actions}>
        <AppButton
          title={t('driver.openMaps')}
          variant="secondary"
          onPress={() => {
            if (!mapsUrl) {
              Alert.alert(t('common.appName'), t('driver.noDestination'));
              return;
            }
            void Linking.openURL(mapsUrl);
          }}
        />
        <AppButton
          title={t('driver.markOutForDelivery')}
          onPress={() => void updateStatus('OUT_FOR_DELIVERY')}
          disabled={statusLoading || order.status !== 'ASSIGNED'}
          loading={statusLoading && order.status === 'ASSIGNED'}
        />
        <AppButton
          title={t('driver.markCompleted')}
          onPress={() => void updateStatus('COMPLETED')}
          disabled={statusLoading || order.status !== 'OUT_FOR_DELIVERY'}
          loading={statusLoading && order.status === 'OUT_FOR_DELIVERY'}
        />
      </View>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  block: {
    gap: theme.spacing.xs,
  },
  actions: {
    gap: theme.spacing.md,
  },
});
