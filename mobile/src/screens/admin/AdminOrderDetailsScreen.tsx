import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { EmptyState } from '@/components/EmptyState';
import { InfoLine } from '@/components/admin/InfoLine';
import { DetailPageSkeleton } from '@/components/skeleton/PageSkeletons';
import { TopAppBar } from '@/components/TopAppBar';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { RootStackParamList } from '@/navigation/types';
import { adminService } from '@/services/adminService';
import { menuService } from '@/services/menuService';
import { orderService } from '@/services/orderService';
import { theme } from '@/theme';
import { MenuResponse, OrderRead, UserSummary } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { formatCurrency, formatDateTime, toNumber } from '@/utils/format';
import { mirroredRow } from '@/utils/layout';
import {
  buildMenuSnapshotLookup,
  getLocalizedOrderAddonName,
  getLocalizedOrderItemName,
  getLocalizedOrderSizeName,
} from '@/utils/orderLocalization';
import { isFinalDeliveredStatus } from '@/utils/orderStatus';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminOrderDetails'>;

const getStatusTone = (status: OrderRead['status']) => {
  if (status === 'CANCELLED') return 'error';
  if (isFinalDeliveredStatus(status)) return 'success';
  if (status === 'NEW' || status === 'ACCEPTED') return 'warning';
  return 'info';
};

const getItemsSubtotal = (order: OrderRead) =>
  order.items.reduce((sum, item) => {
    const addons = item.addons.reduce((addonSum, addon) => addonSum + toNumber(addon.price_snapshot), 0);
    return sum + (toNumber(item.price_snapshot) + addons) * item.quantity;
  }, 0);

const optionalDate = (value: string | null | undefined, language: 'en' | 'ar') =>
  value ? formatDateTime(value, language) : '-';

export const AdminOrderDetailsScreen = ({ route, navigation }: Props) => {
  const { orderId } = route.params;
  const { t, language, isRTL } = useAppTranslation();
  const [order, setOrder] = useState<OrderRead | null>(null);
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<UserSummary[]>([]);
  const [driversError, setDriversError] = useState<string | null>(null);
  const [mutatingAction, setMutatingAction] = useState<string | null>(null);
  const menuSnapshotLookup = useMemo(() => buildMenuSnapshotLookup(menu), [menu]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [orderResult, menuResult, driversResult] = await Promise.allSettled([
        orderService.getById(orderId),
        menuService.getMenu(),
        adminService.listDrivers(undefined, true),
      ]);
      if (orderResult.status === 'rejected') {
        throw orderResult.reason;
      }
      setOrder(orderResult.value);
      if (menuResult.status === 'fulfilled') {
        setMenu(menuResult.value);
      }
      if (driversResult.status === 'fulfilled') {
        setDrivers(driversResult.value.users.filter((driver) => driver.is_active && !driver.is_banned));
        setDriversError(null);
      } else {
        setDriversError(getApiErrorMessage(driversResult.reason, t));
      }
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }, [orderId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshOrder = useCallback(async () => {
    setOrder(await orderService.getById(orderId));
  }, [orderId]);

  const runOrderMutation = useCallback(
    async (key: string, mutation: () => Promise<unknown>) => {
      try {
        setMutatingAction(key);
        await mutation();
        await refreshOrder();
      } catch (e) {
        Alert.alert(t('common.error'), getApiErrorMessage(e, t));
      } finally {
        setMutatingAction(null);
      }
    },
    [refreshOrder, t],
  );

  const confirmOrderMutation = useCallback(
    (key: string, actionLabel: string, mutation: () => Promise<unknown>) => {
      Alert.alert(
        t('admin.confirmOrderActionTitle'),
        t('admin.confirmOrderActionMessage', { action: actionLabel }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            onPress: () => {
              void runOrderMutation(key, mutation);
            },
          },
        ],
      );
    },
    [runOrderMutation, t],
  );

  if (loading) {
    return <DetailPageSkeleton isRTL={isRTL} />;
  }

  if (error || !order) {
    return (
      <EmptyState
        title={t('common.error')}
        subtitle={error ?? t('errors.generic')}
        actionLabel={t('common.retry')}
        onAction={() => void load()}
      />
    );
  }

  const itemsSubtotal = toNumber(order.subtotal_amount ?? getItemsSubtotal(order));
  const discountAmount = toNumber(order.discount_amount ?? 0);
  const deliveryFee = toNumber(order.delivery_fee ?? 0);
  const totalAmount = toNumber(order.total_amount ?? itemsSubtotal - discountAmount + deliveryFee);
  const promotionTitle =
    language === 'ar' ? order.applied_promotion_title_ar || order.applied_promotion_title_en : order.applied_promotion_title_en || order.applied_promotion_title_ar;
  const isMutating = mutatingAction !== null;
  const canCancel = ['NEW', 'ACCEPTED', 'ASSIGNED', 'READY', 'OUT_FOR_DELIVERY'].includes(order.status);

  const forwardAction = (() => {
    if (order.status === 'NEW') {
      return {
        key: 'accept',
        label: t('admin.acceptOrder'),
        run: () => orderService.accept(order.id),
      };
    }
    if (order.order_type === 'pickup' && order.status === 'ACCEPTED') {
      return {
        key: 'complete',
        label: t('admin.completeOrder'),
        run: () => orderService.updateStatus(order.id, 'COMPLETED'),
      };
    }
    if (order.order_type === 'delivery' && order.status === 'ASSIGNED') {
      return {
        key: 'ready',
        label: t('admin.markOrderReady'),
        run: () => orderService.updateStatus(order.id, 'READY'),
      };
    }
    if (order.order_type === 'delivery' && order.status === 'READY') {
      return {
        key: 'out-for-delivery',
        label: t('admin.markOutForDelivery'),
        run: () => orderService.updateStatus(order.id, 'OUT_FOR_DELIVERY'),
      };
    }
    if (order.order_type === 'delivery' && order.status === 'OUT_FOR_DELIVERY') {
      return {
        key: 'delivered',
        label: t('admin.markDelivered'),
        run: () => orderService.updateStatus(order.id, 'DELIVERED'),
      };
    }
    return null;
  })();

  return (
    <View style={styles.screen}>
      <TopAppBar title={t('admin.orderDetailsTitle')} onBack={() => navigation.goBack()} />
      <AppShell includeTopInset={false} refreshing={loading} onRefresh={() => void load()} resetScrollKey={order.id}>
        <View style={[styles.header, mirroredRow(isRTL)]}>
          <BadgeChip label={t(`status.${order.status}`)} tone={getStatusTone(order.status)} />
          <BadgeChip
            label={order.order_type === 'pickup' ? t('admin.orderTypePickup') : t('admin.orderTypeDelivery')}
            tone="default"
          />
          <BadgeChip label={formatCurrency(totalAmount, language)} tone="success" />
        </View>

        <View style={styles.titleBlock}>
          <AppText variant="h2">{`#${order.order_number}`}</AppText>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            {formatDateTime(order.created_at, language)}
          </AppText>
        </View>

        <AppCard style={styles.card}>
          <AppText variant="h3">{t('admin.manageOrderStatus')}</AppText>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            {t('admin.currentOrderStatus', { status: t(`status.${order.status}`) })}
          </AppText>

          {order.order_type === 'delivery' && order.status === 'ACCEPTED' ? (
            <View style={styles.actionStack}>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                {t('admin.assignDriverPrompt')}
              </AppText>
              {driversError ? (
                <AppText variant="bodySmall" color={theme.colors.error}>{driversError}</AppText>
              ) : drivers.length === 0 ? (
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>{t('admin.noActiveDrivers')}</AppText>
              ) : (
                drivers.map((driver) => {
                  const driverName = `${driver.first_name} ${driver.last_name}`.trim();
                  const actionKey = `assign-${driver.id}`;
                  return (
                    <AppButton
                      key={driver.id}
                      testID={`admin-assign-driver-${driver.id}`}
                      title={driverName || driver.phone_number}
                      variant="secondary"
                      loading={mutatingAction === actionKey}
                      disabled={isMutating}
                      onPress={() =>
                        confirmOrderMutation(
                          actionKey,
                          t('admin.assignDriverAction', { driver: driverName || driver.phone_number }),
                          () => adminService.assignDriverToOrder(order.id, driver.id),
                        )
                      }
                    />
                  );
                })
              )}
            </View>
          ) : forwardAction ? (
            <AppButton
              testID="admin-forward-status"
              title={forwardAction.label}
              loading={mutatingAction === forwardAction.key}
              disabled={isMutating}
              onPress={() => confirmOrderMutation(forwardAction.key, forwardAction.label, forwardAction.run)}
            />
          ) : (
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {t('admin.noStatusActionsAvailable')}
            </AppText>
          )}

          {canCancel ? (
            <AppButton
              testID="admin-cancel-order"
              title={t('admin.cancelOrder')}
              variant="destructive"
              loading={mutatingAction === 'cancel'}
              disabled={isMutating}
              onPress={() =>
                confirmOrderMutation(
                  'cancel',
                  t('admin.cancelOrder'),
                  () => orderService.updateStatus(order.id, 'CANCELLED'),
                )
              }
            />
          ) : null}
        </AppCard>

        <AppCard style={styles.card}>
          <AppText variant="h3">{t('admin.customerDetails')}</AppText>
          <InfoLine label={t('admin.customerName')} value={order.customer_name || '-'} numberOfLines={2} />
          <InfoLine label={t('profile.phone')} value={order.customer_phone || '-'} numberOfLines={2} />
          {order.notes ? <InfoLine label={t('common.notes')} value={order.notes} numberOfLines={4} /> : null}
        </AppCard>

        <AppCard style={styles.card}>
          <AppText variant="h3">{t('admin.fulfillmentDetails')}</AppText>
          <InfoLine label={t('orders.orderType')} value={order.order_type === 'pickup' ? t('checkout.pickup') : t('checkout.delivery')} />
          <InfoLine
            label={t('orders.paymentMethod')}
            value={t(order.payment_method === 'CARD' ? 'orders.paymentCard' : 'orders.paymentCash')}
          />
          <InfoLine label={t('admin.assignedDriver')} value={order.assigned_driver_name || order.assigned_driver_phone || t('admin.none')} numberOfLines={2} />
          {order.assigned_driver_phone ? <InfoLine label={t('admin.driverPhone')} value={order.assigned_driver_phone} /> : null}
          <InfoLine label={t('admin.assignedAt')} value={optionalDate(order.assigned_at, language)} />
          <InfoLine label={t('orders.completedAt')} value={optionalDate(order.completed_at, language)} />
          {order.order_type === 'delivery' ? (
            <>
              <InfoLine label={t('orders.deliveryAddress')} value={order.delivery_address_text || order.delivery_address || '-'} numberOfLines={4} />
              <InfoLine label={t('admin.deliveryDistance')} value={order.delivery_distance_km ? `${order.delivery_distance_km} km` : '-'} />
            </>
          ) : null}
        </AppCard>

        <AppCard style={styles.card}>
          <AppText variant="h3">{t('orders.summaryTitle')}</AppText>
          <View style={styles.summaryList}>
            <View style={[styles.summaryRow, mirroredRow(isRTL)]}>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>{t('common.subtotal')}</AppText>
              <AppText variant="bodySmall">{formatCurrency(itemsSubtotal, language)}</AppText>
            </View>
            <View style={[styles.summaryRow, mirroredRow(isRTL)]}>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>{t('common.discount')}</AppText>
              <AppText variant="bodySmall" color={discountAmount > 0 ? theme.colors.success : theme.colors.textPrimary}>
                {discountAmount > 0 ? `-${formatCurrency(discountAmount, language)}` : formatCurrency(0, language)}
              </AppText>
            </View>
            <View style={[styles.summaryRow, mirroredRow(isRTL)]}>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>{t('checkout.deliveryFee')}</AppText>
              <AppText variant="bodySmall">{formatCurrency(deliveryFee, language)}</AppText>
            </View>
            <View style={[styles.summaryRow, mirroredRow(isRTL)]}>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>{t('common.total')}</AppText>
              <AppText variant="h3">{formatCurrency(totalAmount, language)}</AppText>
            </View>
          </View>
          <InfoLine label={t('admin.appliedPromotion')} value={promotionTitle || t('admin.none')} numberOfLines={3} />
        </AppCard>

        <AppCard style={styles.card}>
          <AppText variant="h3">{t('orders.itemsTitle')}</AppText>
          {order.items.map((line) => {
            const addonsTotal = line.addons.reduce((sum, addon) => sum + toNumber(addon.price_snapshot), 0);
            const unitTotal = toNumber(line.price_snapshot) + addonsTotal;
            return (
              <View key={line.id} style={styles.lineWrap}>
                <View style={[styles.lineTop, mirroredRow(isRTL)]}>
                  <AppText variant="h3" style={styles.lineTitle}>
                    {getLocalizedOrderItemName(line, menuSnapshotLookup, language)}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.textSecondary}>{`${line.quantity}x`}</AppText>
                </View>
                <InfoLine label={t('admin.orderVariant')} value={getLocalizedOrderSizeName(line, menuSnapshotLookup, language)} numberOfLines={2} />
                <InfoLine label={t('admin.unitPrice')} value={formatCurrency(toNumber(line.price_snapshot), language)} />
                {line.addons.length > 0 ? (
                  <View style={styles.addons}>
                    <AppText variant="bodySmall" color={theme.colors.textSecondary}>{t('admin.addons')}</AppText>
                    {line.addons.map((addon) => (
                      <InfoLine
                        key={addon.id}
                        label={getLocalizedOrderAddonName(addon, menuSnapshotLookup, language)}
                        value={formatCurrency(toNumber(addon.price_snapshot), language)}
                        numberOfLines={2}
                      />
                    ))}
                  </View>
                ) : null}
                <InfoLine label={t('admin.lineTotal')} value={formatCurrency(unitTotal * line.quantity, language)} />
              </View>
            );
          })}
        </AppCard>

        <AppCard style={styles.card}>
          <AppText variant="h3">{t('admin.auditDetails')}</AppText>
          <InfoLine label={t('orders.placedAt')} value={formatDateTime(order.created_at, language)} />
          {order.rating ? (
            <>
              <InfoLine label={t('admin.rating')} value={`${order.rating.stars}/5`} />
              <InfoLine label={t('common.notes')} value={order.rating.note || '-'} numberOfLines={4} />
              <InfoLine label={t('admin.ratingAt')} value={formatDateTime(order.rating.created_at, language)} />
            </>
          ) : (
            <InfoLine label={t('admin.rating')} value={t('admin.none')} />
          )}
        </AppCard>

        <AppButton title={t('common.goBack')} variant="secondary" onPress={() => navigation.goBack()} />
      </AppShell>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  titleBlock: {
    gap: theme.spacing.xs,
  },
  card: {
    gap: theme.spacing.sm,
  },
  actionStack: {
    gap: theme.spacing.sm,
  },
  summaryList: {
    gap: theme.spacing.sm,
  },
  summaryRow: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  lineWrap: {
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  lineTop: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  lineTitle: {
    flex: 1,
  },
  addons: {
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
});
