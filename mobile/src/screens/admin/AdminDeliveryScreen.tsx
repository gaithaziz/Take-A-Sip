import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { AdminTabParamList } from '@/navigation/types';
import { adminService } from '@/services/adminService';
import { theme } from '@/theme';
import { DeliveryDistanceBand, OrderRead, UserSummary } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';

type Props = BottomTabScreenProps<AdminTabParamList, 'AdminDelivery'>;

export const AdminDeliveryScreen = (_: Props) => {
  const { t } = useAppTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bands, setBands] = useState<DeliveryDistanceBand[]>([]);
  const [drivers, setDrivers] = useState<UserSummary[]>([]);
  const [minDistance, setMinDistance] = useState('');
  const [maxDistance, setMaxDistance] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [latestDeliveryOrders, setLatestDeliveryOrders] = useState<OrderRead[]>([]);
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [bandData, driversData, latestOrdersData] = await Promise.all([
        adminService.listDeliveryDistanceBands(),
        adminService.listDrivers(undefined, true),
        adminService.listLatestOrders({ order_type: 'delivery', limit: 20 }),
      ]);
      setBands(bandData.bands);
      setDrivers(driversData.users);
      setLatestDeliveryOrders(latestOrdersData.orders);
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (error) {
    return <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={load} />;
  }

  return (
    <AppShell refreshing={loading} onRefresh={load}>
      <AppText variant="h1">{t('admin.deliveryTitle')}</AppText>
      <AppCard style={styles.block}>
        <AppText variant="h3">{t('admin.deliveryFeeBands')}</AppText>
        <AppInput
          label={t('admin.minDistanceKm')}
          value={minDistance}
          keyboardType="numeric"
          onChangeText={setMinDistance}
        />
        <AppInput
          label={t('admin.maxDistanceKm')}
          value={maxDistance}
          keyboardType="numeric"
          onChangeText={setMaxDistance}
        />
        <AppInput label={t('admin.feeAmount')} value={feeAmount} keyboardType="numeric" onChangeText={setFeeAmount} />
        <AppButton
          title={t('admin.addDistanceBand')}
          onPress={() => {
            const min = Number(minDistance);
            const max = Number(maxDistance);
            const fee = Number(feeAmount);
            if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(fee)) {
              Alert.alert(t('common.appName'), t('errors.generic'));
              return;
            }
            void (async () => {
              try {
                await adminService.createDeliveryDistanceBand({
                  min_distance_km: min,
                  max_distance_km: max,
                  fee_amount: fee,
                  is_active: true,
                  sort_order: bands.length,
                });
                setMinDistance('');
                setMaxDistance('');
                setFeeAmount('');
                await load();
              } catch (e) {
                Alert.alert(t('common.appName'), getApiErrorMessage(e, t));
              }
            })();
          }}
        />
        <View style={styles.list}>
          {bands.map((band) => (
            <AppCard key={band.id} style={styles.bandRow}>
              <View style={styles.bandTop}>
                <AppText variant="h3">
                  {band.min_distance_km} - {band.max_distance_km} km
                </AppText>
                <AppText>{band.fee_amount}</AppText>
              </View>
              <View style={styles.bandActions}>
                <AppButton
                  title={band.is_active ? t('admin.disable') : t('admin.enable')}
                  variant="secondary"
                  onPress={() => {
                    void (async () => {
                      await adminService.updateDeliveryDistanceBand(band.id, { is_active: !band.is_active });
                      await load();
                    })();
                  }}
                />
                <AppButton
                  title={t('admin.delete')}
                  variant="ghost"
                  onPress={() => {
                    void (async () => {
                      await adminService.deleteDeliveryDistanceBand(band.id);
                      await load();
                    })();
                  }}
                />
              </View>
            </AppCard>
          ))}
        </View>
      </AppCard>
      <AppCard style={styles.block}>
        <AppText variant="h3">{t('admin.driversTitle')}</AppText>
        <View style={styles.list}>
          {drivers.map((driver) => (
            <View key={driver.id} style={styles.driverRow}>
              <AppText>{`${driver.first_name} ${driver.last_name}`}</AppText>
              <AppText color={theme.colors.textSecondary}>{driver.phone_number}</AppText>
            </View>
          ))}
        </View>
      </AppCard>
      <AppCard style={styles.block}>
        <AppText variant="h3">{t('admin.latestDeliveryOrders')}</AppText>
        <View style={styles.list}>
          {latestDeliveryOrders.map((order) => (
            <AppCard key={order.id} style={styles.orderRow}>
              <AppText variant="h3">#{order.order_number}</AppText>
              <AppText color={theme.colors.textSecondary}>{order.customer_name || '-'}</AppText>
              <AppText color={theme.colors.textSecondary}>{order.delivery_address_text || order.delivery_address || '-'}</AppText>
              <AppText>{t(`status.${order.status}`)}</AppText>
              <AppText color={theme.colors.textSecondary}>
                {order.assigned_driver_name || order.assigned_driver_id || t('admin.none')}
              </AppText>
              {order.status === 'ACCEPTED' || order.status === 'ASSIGNED' ? (
                <View style={styles.driverActions}>
                  {drivers
                    .filter((d) => d.is_active && !d.is_banned)
                    .slice(0, 3)
                    .map((driver) => (
                      <AppButton
                        key={driver.id}
                        title={`${driver.first_name} ${driver.last_name}`}
                        variant="secondary"
                        loading={assigningOrderId === order.id}
                        disabled={assigningOrderId === order.id}
                        onPress={() => {
                          void (async () => {
                            try {
                              setAssigningOrderId(order.id);
                              await adminService.assignDriverToOrder(order.id, driver.id);
                              await load();
                            } catch (e) {
                              Alert.alert(t('common.appName'), getApiErrorMessage(e, t));
                            } finally {
                              setAssigningOrderId(null);
                            }
                          })();
                        }}
                      />
                    ))}
                </View>
              ) : null}
            </AppCard>
          ))}
        </View>
      </AppCard>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  block: {
    gap: theme.spacing.sm,
  },
  list: {
    gap: theme.spacing.xs,
  },
  bandRow: {
    gap: theme.spacing.xs,
    borderColor: theme.colors.primary100,
  },
  bandTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverRow: {
    paddingVertical: theme.spacing.xs,
  },
  bandActions: {
    gap: theme.spacing.xs,
  },
  orderRow: {
    gap: theme.spacing.xs,
    borderColor: theme.colors.primary100,
  },
  driverActions: {
    gap: theme.spacing.xs,
  },
});
