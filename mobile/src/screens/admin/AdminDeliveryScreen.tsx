import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ActionRow } from '@/components/admin/ActionRow';
import { AdminPageSection } from '@/components/admin/AdminPageSection';
import { InfoLine } from '@/components/admin/InfoLine';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { AdminTabParamList } from '@/navigation/types';
import { adminService } from '@/services/adminService';
import { theme } from '@/theme';
import { DeliveryDistanceBand, OrderRead, UserSummary } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { isFinalDeliveredStatus } from '@/utils/orderStatus';

type Props = BottomTabScreenProps<AdminTabParamList, 'AdminDelivery'>;

const needsDriverAssignment = (order: OrderRead) => order.status === 'ACCEPTED' && !order.assigned_driver_id;

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
  const [mutatingBandId, setMutatingBandId] = useState<string | null>(null);
  const [creatingBand, setCreatingBand] = useState(false);

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

  const activeDrivers = useMemo(() => drivers.filter((driver) => driver.is_active && !driver.is_banned), [drivers]);
  const pendingOrders = useMemo(() => latestDeliveryOrders.filter(needsDriverAssignment), [latestDeliveryOrders]);

  const onCreateBand = async () => {
    const min = Number(minDistance);
    const max = Number(maxDistance);
    const fee = Number(feeAmount);
    if (!Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(fee)) {
      Alert.alert(t('common.error'), t('errors.generic'));
      return;
    }
    try {
      setCreatingBand(true);
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
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    } finally {
      setCreatingBand(false);
    }
  };

  const confirmBandToggle = (band: DeliveryDistanceBand) => {
    const nextActive = !band.is_active;
    Alert.alert(
      nextActive ? t('admin.enable') : t('admin.disable'),
      `${nextActive ? t('admin.enable') : t('admin.disable')}: ${band.min_distance_km}-${band.max_distance_km} km`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: () => {
            void (async () => {
              try {
                setMutatingBandId(band.id);
                await adminService.updateDeliveryDistanceBand(band.id, { is_active: nextActive });
                await load();
              } catch (e) {
                Alert.alert(t('common.error'), getApiErrorMessage(e, t));
              } finally {
                setMutatingBandId(null);
              }
            })();
          },
        },
      ],
    );
  };

  const confirmBandDelete = (band: DeliveryDistanceBand) => {
    Alert.alert(
      t('admin.delete'),
      `${band.min_distance_km}-${band.max_distance_km} km`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('admin.delete'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                setMutatingBandId(band.id);
                await adminService.deleteDeliveryDistanceBand(band.id);
                await load();
              } catch (e) {
                Alert.alert(t('common.error'), getApiErrorMessage(e, t));
              } finally {
                setMutatingBandId(null);
              }
            })();
          },
        },
      ],
    );
  };

  const assignDriver = async (orderId: string, driverId: string) => {
    try {
      setAssigningOrderId(orderId);
      await adminService.assignDriverToOrder(orderId, driverId);
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    } finally {
      setAssigningOrderId(null);
    }
  };

  if (loading) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (error) {
    return <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={load} />;
  }

  return (
    <AppShell refreshing={loading} onRefresh={load}>
      <View style={styles.headingBlock}>
        <AppText variant="h1">{t('admin.deliveryTitle')}</AppText>
        <View style={styles.summaryRow}>
          <BadgeChip label={`${t('admin.driversTitle')}: ${activeDrivers.length}`} tone="success" />
          <BadgeChip label={`${t('admin.needsDriverAssignment')}: ${pendingOrders.length}`} tone={pendingOrders.length > 0 ? 'warning' : 'default'} />
        </View>
      </View>

      <AdminPageSection title={t('admin.deliveryFeeBands')} subtitle={t('admin.addDistanceBand')}>
        <View style={styles.formStack}>
          <View style={styles.formGrid}>
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
          </View>
          <AppInput label={t('admin.feeAmount')} value={feeAmount} keyboardType="numeric" onChangeText={setFeeAmount} />
          <AppButton title={t('admin.addDistanceBand')} onPress={() => void onCreateBand()} loading={creatingBand} disabled={creatingBand} />

          <View style={styles.list}>
            {bands.map((band) => (
              <AppCard key={band.id} style={styles.deliveryCard}>
                <View style={styles.cardHeader}>
                  <AppText variant="h3">{`${band.min_distance_km} - ${band.max_distance_km} km`}</AppText>
                  <BadgeChip label={band.is_active ? t('admin.active') : t('admin.inactive')} tone={band.is_active ? 'success' : 'default'} />
                </View>
                <View style={styles.infoBox}>
                  <InfoLine label={t('admin.feeAmount')} value={band.fee_amount} />
                </View>
                <ActionRow>
                  <AppButton
                    title={band.is_active ? t('admin.disable') : t('admin.enable')}
                    variant="secondary"
                    onPress={() => confirmBandToggle(band)}
                    style={styles.flexButton}
                    loading={mutatingBandId === band.id}
                    disabled={Boolean(mutatingBandId && mutatingBandId !== band.id)}
                  />
                  <AppButton
                    title={t('admin.delete')}
                    variant="destructive"
                    onPress={() => confirmBandDelete(band)}
                    style={styles.flexButton}
                    loading={mutatingBandId === band.id}
                    disabled={Boolean(mutatingBandId && mutatingBandId !== band.id)}
                  />
                </ActionRow>
              </AppCard>
            ))}
          </View>
        </View>
      </AdminPageSection>

      <AdminPageSection title={t('admin.driversTitle')} subtitle={t('admin.deliveryTitle')}>
        {activeDrivers.length === 0 ? (
          <EmptyState title={t('admin.driversTitle')} subtitle={t('admin.noUsersSubtitle')} />
        ) : (
          <View style={styles.list}>
            {activeDrivers.map((driver) => (
              <AppCard key={driver.id} style={styles.deliveryCard}>
                <View style={styles.cardHeader}>
                  <AppText variant="h3">{`${driver.first_name} ${driver.last_name}`}</AppText>
                  <BadgeChip label={driver.is_banned ? t('admin.banned') : t('admin.active')} tone={driver.is_banned ? 'error' : 'success'} />
                </View>
                <View style={styles.infoBox}>
                  <InfoLine label={t('profile.phone')} value={driver.phone_number} />
                  <InfoLine label={t('admin.orderCount')} value={String(driver.order_count)} />
                </View>
              </AppCard>
            ))}
          </View>
        )}
      </AdminPageSection>

      <AdminPageSection title={t('admin.latestDeliveryOrders')} subtitle={t('admin.tapToOpen')}>
        {latestDeliveryOrders.length === 0 ? (
          <EmptyState title={t('admin.latestDeliveryOrders')} subtitle={t('admin.noLatestOrders')} />
        ) : (
          <View style={styles.list}>
            {latestDeliveryOrders.map((order) => (
              <AppCard key={order.id} style={styles.deliveryCard}>
                <View style={styles.cardHeader}>
                  <AppText variant="h3">#{order.order_number}</AppText>
                  <BadgeChip
                    label={t(`status.${order.status}`)}
                    tone={needsDriverAssignment(order) ? 'warning' : isFinalDeliveredStatus(order.status) ? 'success' : 'info'}
                  />
                </View>
                <View style={styles.infoBox}>
                  <InfoLine label={t('admin.usersTitle')} value={order.customer_name || '-'} numberOfLines={1} />
                  <InfoLine label={t('checkout.deliveryAddress')} value={order.delivery_address_text || order.delivery_address || '-'} numberOfLines={2} />
                  <InfoLine label={t('admin.driversTitle')} value={order.assigned_driver_name || order.assigned_driver_id || t('admin.none')} numberOfLines={1} />
                </View>
                {needsDriverAssignment(order) ? (
                  <View style={styles.assignmentList}>
                    <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                      {t('admin.assignDriverPrompt')}
                    </AppText>
                    {activeDrivers.slice(0, 3).map((driver) => (
                      <AppButton
                        key={driver.id}
                        title={`${driver.first_name} ${driver.last_name}`}
                        variant="secondary"
                        loading={assigningOrderId === order.id}
                        disabled={assigningOrderId === order.id}
                        onPress={() => {
                          void assignDriver(order.id, driver.id);
                        }}
                      />
                    ))}
                  </View>
                ) : order.status === 'ASSIGNED' && order.assigned_driver_name ? (
                  <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                    {`${t('admin.driverAssigned')}: ${order.assigned_driver_name}`}
                  </AppText>
                ) : null}
              </AppCard>
            ))}
          </View>
        )}
      </AdminPageSection>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  headingBlock: {
    gap: theme.spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  formStack: {
    gap: theme.spacing.md,
  },
  formGrid: {
    gap: theme.spacing.md,
  },
  list: {
    gap: theme.spacing.sm,
  },
  deliveryCard: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  infoBox: {
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
  },
  assignmentList: {
    gap: theme.spacing.sm,
  },
  flexButton: {
    flex: 1,
  },
});
