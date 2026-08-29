import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { EmptyState } from '@/components/EmptyState';
import { DetailPageSkeleton } from '@/components/skeleton/PageSkeletons';
import { TopAppBar } from '@/components/TopAppBar';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { RootStackParamList } from '@/navigation/types';
import { menuService } from '@/services/menuService';
import { orderService } from '@/services/orderService';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { MenuResponse, OrderRead } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { formatCurrency, formatDateTime, toNumber } from '@/utils/format';
import { mirroredRow } from '@/utils/layout';
import {
  buildMenuSnapshotLookup,
  getLocalizedOrderItemName,
  getLocalizedOrderSizeName,
} from '@/utils/orderLocalization';
import { getCustomerOrderStatusKey, getOrderRatingAvailabilityKey, isOrderRateable } from '@/utils/orderStatus';

type Props = NativeStackScreenProps<RootStackParamList, 'ClientOrderDetails'>;

const statusToneMap = {
  NEW: 'warning',
  ACCEPTED: 'info',
  ASSIGNED: 'info',
  READY: 'info',
  OUT_FOR_DELIVERY: 'info',
  DELIVERED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'error',
} as const;

const getItemsSubtotal = (order: OrderRead) =>
  order.items.reduce((sum, item) => {
    const addons = item.addons.reduce((addonSum, addon) => addonSum + toNumber(addon.price_snapshot), 0);
    return sum + (toNumber(item.price_snapshot) + addons) * item.quantity;
  }, 0);

export const ClientOrderDetailsScreen = ({ route, navigation }: Props) => {
  const { orderId } = route.params;
  const { t, language } = useAppTranslation();
  const { isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderRead | null>(null);
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingNote, setRatingNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const menuSnapshotLookup = useMemo(() => buildMenuSnapshotLookup(menu), [menu]);

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [orderResult, menuResult] = await Promise.allSettled([
        orderService.getById(orderId),
        menuService.getMenu(),
      ]);
      if (orderResult.status === 'rejected') {
        throw orderResult.reason;
      }
      setOrder(orderResult.value);
      if (menuResult.status === 'fulfilled') {
        setMenu(menuResult.value);
      }
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }, [orderId, t]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const onSubmitRating = async () => {
    if (!order) {
      return;
    }
    if (ratingStars < 1 || ratingStars > 5) {
      Alert.alert(t('common.appName'), t('orders.ratingStarsRequired'));
      return;
    }

    try {
      setSubmitting(true);
      const rating = await orderService.submitRating(order.id, {
        stars: ratingStars,
        note: ratingNote.trim() || undefined,
      });
      setOrder({ ...order, rating });
      Alert.alert(t('common.appName'), t('orders.ratingSubmitted'));
    } catch (e) {
      Alert.alert(t('common.appName'), getApiErrorMessage(e, t));
    } finally {
      setSubmitting(false);
    }
  };

  const cancelOrder = async () => {
    if (!order || order.status !== 'NEW') {
      return;
    }
    try {
      setCancelling(true);
      const result = await orderService.updateStatus(order.id, 'CANCELLED');
      setOrder({ ...order, status: result.status as OrderRead['status'] });
      Alert.alert(t('common.appName'), t('orders.cancelled'));
    } catch (e) {
      Alert.alert(t('common.appName'), getApiErrorMessage(e, t));
    } finally {
      setCancelling(false);
    }
  };

  const confirmCancelOrder = () => {
    Alert.alert(t('orders.cancelOrder'), t('orders.cancelOrderConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('orders.cancelOrder'),
        style: 'destructive',
        onPress: () => void cancelOrder(),
      },
    ]);
  };

  if (loading) {
    return <DetailPageSkeleton isRTL={isRTL} />;
  }

  if (error || !order) {
    return (
      <EmptyState
        title={t('common.error')}
        subtitle={error ?? t('errors.generic')}
        actionLabel={t('common.retry')}
        onAction={loadOrder}
      />
    );
  }

  const itemsSubtotal = toNumber(order.subtotal_amount ?? getItemsSubtotal(order));
  const discountAmount = toNumber(order.discount_amount ?? 0);
  const deliveryFee = toNumber(order.delivery_fee ?? 0);
  const totalAmount = toNumber(order.total_amount ?? itemsSubtotal - discountAmount + deliveryFee);
  const canRateOrder = isOrderRateable(order);
  const statusLabel = t(getCustomerOrderStatusKey(order.status));

  return (
    <View style={styles.screen}>
      <TopAppBar title={t('orders.detailsTitle')} onBack={() => navigation.goBack()} />
      <AppShell includeTopInset={false} resetScrollKey={order.id}>
        <View style={[styles.header, mirroredRow(isRTL)]}>
          <BadgeChip label={statusLabel} tone={statusToneMap[order.status]} />
          <BadgeChip label={formatCurrency(totalAmount, language)} tone="success" />
        </View>

        <View style={styles.titleBlock}>
          <AppText variant="h2">{`#${order.order_number}`}</AppText>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            {formatDateTime(order.created_at, language)}
          </AppText>
        </View>

        {order.status === 'ACCEPTED' ? (
          <View style={[styles.progressNotice, mirroredRow(isRTL)]}>
            <View style={styles.progressIcon}>
              <Ionicons name="time-outline" size={20} color={theme.colors.primary700} />
            </View>
            <View style={styles.progressCopy}>
              <AppText variant="bodySmall" color={theme.colors.primary700}>
                {statusLabel}
              </AppText>
              <AppText variant="caption" color={theme.colors.textSecondary}>
                {t('orders.estimatedReadyTime')}
              </AppText>
            </View>
          </View>
        ) : null}

        {order.status === 'NEW' ? (
          <AppCard style={styles.card}>
            <AppText variant="h3">{t('orders.cancelOrder')}</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {t('orders.cancelOrderAvailable')}
            </AppText>
            <AppButton
              title={t('orders.cancelOrder')}
              testID="order-details-cancel-order"
              variant="destructive"
              loading={cancelling}
              disabled={cancelling}
              onPress={confirmCancelOrder}
            />
          </AppCard>
        ) : null}

        <AppCard style={styles.card}>
          <AppText variant="h3">{t('orders.rateOrder')}</AppText>
          {canRateOrder ? (
            order.rating ? (
              <View style={styles.readOnlyRating}>
                <View style={[styles.starRow, mirroredRow(isRTL)]}>
                  {Array.from({ length: 5 }, (_, index) => (
                    <Ionicons
                      key={`readonly-star-${index}`}
                      name={index < order.rating!.stars ? 'star' : 'star-outline'}
                      size={20}
                      color={theme.colors.warning}
                    />
                  ))}
                </View>
                {order.rating.note ? (
                  <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                    {order.rating.note}
                  </AppText>
                ) : null}
              </View>
            ) : (
              <View style={styles.rateWrap}>
                <View style={[styles.starRow, mirroredRow(isRTL)]}>
                  {Array.from({ length: 5 }, (_, index) => {
                    const starValue = index + 1;
                    return (
                      <Pressable
                        key={`input-star-${starValue}`}
                        onPress={() => setRatingStars(starValue)}
                        testID={`rating-star-${starValue}`}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={`${t('orders.rateOrder')} ${starValue}`}>
                        <Ionicons
                          name={starValue <= ratingStars ? 'star' : 'star-outline'}
                          size={28}
                          color={theme.colors.warning}
                        />
                      </Pressable>
                    );
                  })}
                </View>
                <AppInput
                  multiline
                  maxLength={500}
                  placeholder={t('orders.ratingNotePlaceholder')}
                  value={ratingNote}
                  onChangeText={setRatingNote}
                />
                <AppButton
                  title={t('orders.submitRating')}
                  testID="order-details-submit-rating"
                  loading={submitting}
                  onPress={onSubmitRating}
                />
              </View>
            )
          ) : (
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {t(getOrderRatingAvailabilityKey(order))}
            </AppText>
          )}
        </AppCard>

        <AppCard style={styles.card}>
          <AppText variant="h3">{t('orders.summaryTitle')}</AppText>
          <View style={styles.summaryList}>
            <View style={[styles.summaryRow, mirroredRow(isRTL)]}>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                {t('orders.orderType')}
              </AppText>
              <AppText variant="bodySmall">{t(order.order_type === 'pickup' ? 'checkout.pickup' : 'checkout.delivery')}</AppText>
            </View>
            <View style={[styles.summaryRow, mirroredRow(isRTL)]}>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                {t('orders.paymentMethod')}
              </AppText>
              <AppText variant="bodySmall">
                {t(order.payment_method === 'CARD' ? 'orders.paymentCard' : 'orders.paymentCash')}
              </AppText>
            </View>
            <View style={[styles.summaryRow, mirroredRow(isRTL)]}>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                {t('orders.placedAt')}
              </AppText>
              <AppText variant="bodySmall">{formatDateTime(order.created_at, language)}</AppText>
            </View>
            {order.completed_at ? (
              <View style={[styles.summaryRow, mirroredRow(isRTL)]}>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                  {t('orders.completedAt')}
                </AppText>
                <AppText variant="bodySmall">{formatDateTime(order.completed_at, language)}</AppText>
              </View>
            ) : null}
            {order.order_type === 'delivery' && order.delivery_address_text ? (
              <View style={[styles.summaryRow, mirroredRow(isRTL)]}>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                  {t('orders.deliveryAddress')}
                </AppText>
                <AppText variant="bodySmall" style={styles.summaryValue}>
                  {order.delivery_address_text}
                </AppText>
              </View>
            ) : null}
            <View style={[styles.summaryRow, mirroredRow(isRTL)]}>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                {t('common.subtotal')}
              </AppText>
              <AppText variant="bodySmall">{formatCurrency(itemsSubtotal, language)}</AppText>
            </View>
            {discountAmount > 0 ? (
              <View style={[styles.summaryRow, mirroredRow(isRTL)]}>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                  {t('common.discount')}
                </AppText>
                <AppText variant="bodySmall" color={theme.colors.success}>
                  -{formatCurrency(discountAmount, language)}
                </AppText>
              </View>
            ) : null}
            {order.order_type === 'delivery' ? (
              <View style={[styles.summaryRow, mirroredRow(isRTL)]}>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                  {t('checkout.deliveryFee')}
                </AppText>
                <AppText variant="bodySmall">{formatCurrency(deliveryFee, language)}</AppText>
              </View>
            ) : null}
            <View style={[styles.summaryRow, mirroredRow(isRTL)]}>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                {t('common.total')}
              </AppText>
              <AppText variant="h3">{formatCurrency(totalAmount, language)}</AppText>
            </View>
          </View>
        </AppCard>

        <AppCard style={styles.card}>
          <AppText variant="h3">{t('orders.itemsTitle')}</AppText>
          {order.items.map((line) => (
            <View key={line.id} style={styles.lineWrap}>
              <View style={[styles.lineTop, mirroredRow(isRTL)]}>
                <AppText variant="h3">{getLocalizedOrderItemName(line, menuSnapshotLookup, language)}</AppText>
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  {line.quantity}x
                </AppText>
              </View>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                {getLocalizedOrderSizeName(line, menuSnapshotLookup, language)}
              </AppText>
              <AppText variant="caption" color={theme.colors.primary700}>
                {formatCurrency(
                  (toNumber(line.price_snapshot) +
                    line.addons.reduce((sum, addon) => sum + toNumber(addon.price_snapshot), 0)) *
                    line.quantity,
                  language,
                )}
              </AppText>
            </View>
          ))}
        </AppCard>
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleBlock: {
    gap: theme.spacing.xs,
  },
  progressNotice: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary200,
    backgroundColor: theme.colors.primary50,
  },
  progressIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.white,
  },
  progressCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  card: {
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
  summaryValue: {
    flex: 1,
    textAlign: 'right',
  },
  lineWrap: {
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  lineTop: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  readOnlyRating: {
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.warningSurface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rateWrap: {
    gap: theme.spacing.sm,
  },
  starRow: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
});
