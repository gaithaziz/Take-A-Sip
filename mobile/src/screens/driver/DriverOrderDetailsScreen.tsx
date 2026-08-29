import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Platform, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { EmptyState } from '@/components/EmptyState';
import { InfoLine } from '@/components/admin/InfoLine';
import { DetailPageSkeleton } from '@/components/skeleton/PageSkeletons';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { RootStackParamList } from '@/navigation/types';
import { orderService } from '@/services/orderService';
import { theme } from '@/theme';
import { OrderRead } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { formatCurrency, formatDateTime, toNumber } from '@/utils/format';
import { mirroredRow } from '@/utils/layout';
import {
  buildMenuSnapshotLookup,
  getLocalizedOrderAddonName,
  getLocalizedOrderItemName,
  getLocalizedOrderSizeName,
  getLocalizedOrderTypeName,
} from '@/utils/orderLocalization';

type Props = NativeStackScreenProps<RootStackParamList, 'DriverOrderDetails'>;

export const DriverOrderDetailsScreen = ({ route, navigation }: Props) => {
  const { t, language, isRTL } = useAppTranslation();
  const [order, setOrder] = useState<OrderRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const menuSnapshotLookup = useMemo(() => buildMenuSnapshotLookup(null), []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setOrder(await orderService.getById(route.params.orderId));
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
    if (order.google_maps_url) {
      return order.google_maps_url;
    }
    if (order.delivery_latitude != null && order.delivery_longitude != null) {
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
    async (status: 'OUT_FOR_DELIVERY' | 'DELIVERED') => {
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

  const confirmStatusUpdate = useCallback(
    (status: 'OUT_FOR_DELIVERY' | 'DELIVERED') => {
      const title =
        status === 'DELIVERED' ? t('driver.confirmDeliveredTitle') : t('driver.confirmOutForDeliveryTitle');
      const message =
        status === 'DELIVERED' ? t('driver.confirmDeliveredMessage') : t('driver.confirmOutForDeliveryMessage');
      Alert.alert(title, message, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: () => {
            void updateStatus(status);
          },
        },
      ]);
    },
    [t, updateStatus],
  );

  const openMaps = useCallback(async () => {
    if (!order || !mapsUrl) {
      Alert.alert(t('common.appName'), t('driver.noDestination'));
      return;
    }
    try {
      if (Platform.OS === 'ios') {
        const googleAppUrl =
          order.delivery_latitude != null && order.delivery_longitude != null
            ? `comgooglemaps://?daddr=${order.delivery_latitude},${order.delivery_longitude}&directionsmode=driving`
            : `comgooglemaps://?q=${encodeURIComponent(order.delivery_address_text || order.delivery_address || '')}`;
        if (await Linking.canOpenURL('comgooglemaps://')) {
          await Linking.openURL(googleAppUrl);
          return;
        }
      }
      await Linking.openURL(mapsUrl);
    } catch (e) {
      Alert.alert(t('common.appName'), getApiErrorMessage(e, t));
    }
  }, [mapsUrl, order, t]);

  const callCustomer = useCallback(async () => {
    if (!order?.customer_phone) return;
    try {
      await Linking.openURL(`tel:${order.customer_phone.replace(/\s+/g, '')}`);
    } catch (e) {
      Alert.alert(t('common.appName'), getApiErrorMessage(e, t));
    }
  }, [order, t]);

  if (loading) {
    return <DetailPageSkeleton isRTL={isRTL} />;
  }

  if (error || !order) {
    return <EmptyState title={t('common.error')} subtitle={error ?? t('errors.generic')} actionLabel={t('common.retry')} onAction={load} />;
  }

  const calculatedSubtotal = order.items.reduce((sum, item) => {
    const addons = item.addons.reduce((addonSum, addon) => addonSum + toNumber(addon.price_snapshot), 0);
    return sum + (toNumber(item.price_snapshot) + addons) * item.quantity;
  }, 0);
  const subtotal = toNumber(order.subtotal_amount ?? calculatedSubtotal);
  const discount = toNumber(order.discount_amount ?? 0);
  const deliveryFee = toNumber(order.delivery_fee ?? 0);
  const total = toNumber(order.total_amount ?? subtotal - discount + deliveryFee);
  const promotionTitle = language === 'ar'
    ? order.applied_promotion_title_ar || order.applied_promotion_title_en
    : order.applied_promotion_title_en || order.applied_promotion_title_ar;

  return (
    <AppShell resetScrollKey={order.id}>
      <AppButton title={t('common.goBack')} variant="ghost" fullWidth={false} onPress={() => navigation.goBack()} />
      <View style={[styles.header, mirroredRow(isRTL)]}>
        <AppText variant="h1" style={styles.flex}>#{order.order_number}</AppText>
        <BadgeChip label={t(`status.${order.status}`)} tone={order.status === 'DELIVERED' ? 'success' : 'info'} />
      </View>
      {order.status === 'ASSIGNED' || order.status === 'READY' ? (
        <AppCard style={styles.readinessNotice}>
          <AppText variant="h3">
            {t(order.status === 'READY' ? 'driver.readyForPickupTitle' : 'driver.waitForReadyTitle')}
          </AppText>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            {t(order.status === 'READY' ? 'driver.readyForPickupMessage' : 'driver.waitForReadyMessage')}
          </AppText>
        </AppCard>
      ) : null}
      <AppCard style={styles.block}>
        <AppText variant="h3">{t('driver.orderInformation')}</AppText>
        <InfoLine label={t('orders.placedAt')} value={formatDateTime(order.created_at, language)} />
        <InfoLine label={t('orders.orderType')} value={t(order.order_type === 'delivery' ? 'checkout.delivery' : 'checkout.pickup')} />
        <InfoLine label={t('orders.paymentMethod')} value={t(order.payment_method === 'CARD' ? 'orders.paymentCard' : 'orders.paymentCash')} />
        <InfoLine label={t('driver.customerName')} value={order.customer_name ?? '-'} numberOfLines={2} />
        <InfoLine
          label={t('driver.customerPhone')}
          value={order.customer_phone ?? '-'}
          onPress={order.customer_phone ? () => void callCustomer() : undefined}
          accessibilityLabel={order.customer_phone ? `${t('driver.callCustomer')}: ${order.customer_phone}` : undefined}
        />
        {order.order_type === 'delivery' ? <InfoLine label={t('orders.deliveryAddress')} value={order.delivery_address_text || order.delivery_address || '-'} numberOfLines={4} /> : null}
        <InfoLine label={t('common.notes')} value={order.notes || '-'} numberOfLines={4} />
      </AppCard>
      <AppCard style={styles.block}>
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          {t('driver.items')}
        </AppText>
        {order.items.map((item) => {
          const addonsTotal = item.addons.reduce((sum, addon) => sum + toNumber(addon.price_snapshot), 0);
          const typeName = getLocalizedOrderTypeName(item, language);
          return (
            <View key={item.id} style={styles.itemBlock}>
              <View style={[styles.header, mirroredRow(isRTL)]}>
                <AppText variant="h3" style={styles.flex}>{getLocalizedOrderItemName(item, menuSnapshotLookup, language)}</AppText>
                <AppText variant="caption">{`${item.quantity}x`}</AppText>
              </View>
              {typeName ? <InfoLine label={t('driver.variant')} value={typeName} numberOfLines={2} /> : null}
              <InfoLine label={t('driver.size')} value={getLocalizedOrderSizeName(item, menuSnapshotLookup, language)} numberOfLines={2} />
              <InfoLine label={t('driver.unitPrice')} value={formatCurrency(toNumber(item.price_snapshot), language)} />
              {item.addons.map((addon) => (
                <InfoLine key={addon.id} label={getLocalizedOrderAddonName(addon, menuSnapshotLookup, language)} value={formatCurrency(toNumber(addon.price_snapshot), language)} numberOfLines={2} />
              ))}
              <InfoLine label={t('driver.lineTotal')} value={formatCurrency((toNumber(item.price_snapshot) + addonsTotal) * item.quantity, language)} />
            </View>
          );
        })}
      </AppCard>
      <AppCard style={styles.block}>
        <AppText variant="h3">{t('orders.summaryTitle')}</AppText>
        <InfoLine label={t('common.subtotal')} value={formatCurrency(subtotal, language)} />
        <InfoLine label={t('common.discount')} value={discount ? `-${formatCurrency(discount, language)}` : formatCurrency(0, language)} />
        <InfoLine label={t('checkout.deliveryFee')} value={formatCurrency(deliveryFee, language)} />
        <InfoLine label={t('common.total')} value={formatCurrency(total, language)} />
        <InfoLine label={t('driver.promotion')} value={promotionTitle || '-'} numberOfLines={3} />
      </AppCard>
      <View style={styles.actions}>
        <AppButton title={t('driver.callCustomer')} variant="secondary" onPress={() => void callCustomer()} disabled={!order.customer_phone} />
        <AppButton
          title={t('driver.openMaps')}
          variant="secondary"
          onPress={() => void openMaps()}
        />
        <AppButton
          title={t('driver.markOutForDelivery')}
          testID="driver-mark-out-for-delivery"
          onPress={() => confirmStatusUpdate('OUT_FOR_DELIVERY')}
          disabled={statusLoading || order.status !== 'READY'}
          loading={statusLoading && order.status === 'READY'}
        />
        <AppButton
          title={t('driver.markDelivered')}
          testID="driver-mark-delivered"
          onPress={() => confirmStatusUpdate('DELIVERED')}
          disabled={statusLoading || order.status !== 'OUT_FOR_DELIVERY'}
          loading={statusLoading && order.status === 'OUT_FOR_DELIVERY'}
        />
      </View>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  header: { alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.spacing.sm },
  flex: { flex: 1 },
  block: {
    gap: theme.spacing.xs,
  },
  readinessNotice: {
    gap: theme.spacing.xs,
  },
  itemBlock: { gap: theme.spacing.xs, paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  actions: {
    gap: theme.spacing.md,
  },
});
