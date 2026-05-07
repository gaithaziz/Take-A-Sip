import { FlatList, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { EmptyState } from '@/components/EmptyState';
import { PastOrdersListSkeleton } from '@/components/skeleton/PastOrdersListSkeleton';
import { theme } from '@/theme';
import { OrderRead } from '@/types/api';
import { formatCurrency, formatDateTime, toNumber } from '@/utils/format';
import { mirroredRow } from '@/utils/layout';
import { isOrderRateable } from '@/utils/orderStatus';

const statusToneMap = {
  NEW: 'warning',
  ACCEPTED: 'info',
  ASSIGNED: 'info',
  OUT_FOR_DELIVERY: 'info',
  DELIVERED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'error',
} as const;

type PastOrdersScreenViewProps = {
  title: string;
  loadingLabel: string;
  retryLabel: string;
  emptyTitle: string;
  emptySubtitle: string;
  reorderLabel: string;
  language: 'en' | 'ar';
  isRTL: boolean;
  orders: OrderRead[];
  loading: boolean;
  error: string | null;
  reorderingId: string | null;
  topInset: number;
  bottomInset: number;
  onReload: () => void;
  onReorder: (order: OrderRead) => void;
  onOpenDetails: (orderId: string) => void;
  t: (key: string) => string;
};

export const PastOrdersScreenView = ({
  title,
  loadingLabel,
  retryLabel,
  emptyTitle,
  emptySubtitle,
  reorderLabel,
  language,
  isRTL,
  orders,
  loading,
  error,
  reorderingId,
  topInset,
  bottomInset,
  onReload,
  onReorder,
  onOpenDetails,
  t,
}: PastOrdersScreenViewProps) => {
  const data = orders;
  const getOrderTotal = (order: OrderRead) => {
    if (order.total_amount != null) {
      return toNumber(order.total_amount);
    }
    const itemsTotal = order.items.reduce((sum, item) => {
      const addons = item.addons.reduce((addonSum, addon) => addonSum + toNumber(addon.price_snapshot), 0);
      return sum + (toNumber(item.price_snapshot) + addons) * item.quantity;
    }, 0);
    return itemsTotal - toNumber(order.discount_amount ?? 0) + toNumber(order.delivery_fee ?? 0);
  };

  return (
    <FlatList
      contentInsetAdjustmentBehavior="never"
      data={data}
      keyExtractor={(order) => order.id}
      renderItem={({ item: order }) => (
        <AppCard style={styles.card}>
          <View style={[styles.top, mirroredRow(isRTL)]}>
            <View style={styles.orderMeta}>
              <AppText variant="h3">#{order.order_number}</AppText>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                {t(`status.${order.status}`)}
              </AppText>
              <AppText variant="caption" color={theme.colors.textSecondary}>
                {formatDateTime(order.created_at, language)}
              </AppText>
              <AppText variant="caption" color={theme.colors.primary700}>
                {formatCurrency(getOrderTotal(order), language)}
              </AppText>
            </View>
            <BadgeChip label={t(`status.${order.status}`)} tone={statusToneMap[order.status]} />
          </View>

          <View style={styles.itemsWrap}>
            {order.items.slice(0, 3).map((orderItem) => (
              <View key={orderItem.id} style={[styles.itemLine, mirroredRow(isRTL)]}>
                <AppText variant="bodySmall" numberOfLines={1} style={styles.itemName}>
                  {orderItem.item_name_snapshot}
                </AppText>
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  {orderItem.quantity}x {orderItem.size_snapshot}
                </AppText>
              </View>
            ))}
          </View>

          {isOrderRateable(order) ? (
            <>
              {order.rating ? (
                <View style={[styles.ratingSummary, styles.ratingSummaryDone]}>
                  <AppText variant="caption" color={theme.colors.success}>
                    {t('orders.ratingComplete')}
                  </AppText>
                  <AppText variant="bodySmall" color={theme.colors.textPrimary}>
                    {`${t('orders.rated')} - ${order.rating.stars}/5`}
                  </AppText>
                </View>
              ) : (
                <View style={[styles.ratingSummary, styles.ratingSummaryPending]}>
                  <AppText variant="caption" color={theme.colors.primary700}>
                    {t('orders.ratingReady')}
                  </AppText>
                  <AppButton title={t('orders.rateOrder')} onPress={() => onOpenDetails(order.id)} />
                </View>
              )}
              <AppButton
                title={reorderLabel}
                variant="secondary"
                loading={reorderingId === order.id}
                onPress={() => onReorder(order)}
              />
              <AppButton title={t('orders.viewDetails')} variant="ghost" onPress={() => onOpenDetails(order.id)} />
            </>
          ) : (
            <>
              <AppButton title={t('orders.viewDetails')} onPress={() => onOpenDetails(order.id)} />
              <AppButton
                title={reorderLabel}
                variant="secondary"
                loading={reorderingId === order.id}
                onPress={() => onReorder(order)}
              />
            </>
          )}
        </AppCard>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={
        <View style={styles.headerWrap}>
          <View style={styles.header}>
            <AppText variant="h1">{title}</AppText>
          </View>
          {error && orders.length > 0 ? (
            <AppCard style={styles.errorCard}>
              <AppText variant="caption" color={theme.colors.error}>
                {error}
              </AppText>
              <AppButton title={retryLabel} variant="ghost" fullWidth={false} onPress={onReload} />
            </AppCard>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        loading && orders.length === 0 ? (
          <PastOrdersListSkeleton isRTL={isRTL} />
        ) : error && orders.length === 0 ? (
          <EmptyState title={retryLabel} subtitle={error} actionLabel={retryLabel} onAction={onReload} />
        ) : (
          <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
        )
      }
      refreshing={loading && orders.length > 0}
      onRefresh={onReload}
      initialNumToRender={8}
      maxToRenderPerBatch={8}
      windowSize={5}
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topInset + theme.spacing.md,
          paddingBottom: bottomInset + theme.spacing.xl,
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
  header: {
    marginBottom: theme.spacing.md,
  },
  headerWrap: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  errorCard: {
    gap: theme.spacing.xs,
    borderColor: theme.colors.error,
  },
  separator: {
    height: theme.spacing.md,
  },
  card: {
    gap: theme.spacing.sm,
  },
  top: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  orderMeta: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  itemsWrap: {
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  itemLine: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.secondaryCream,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  itemName: {
    flex: 1,
  },
  ratingSummary: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
  },
  ratingSummaryPending: {
    backgroundColor: theme.colors.primary50,
    borderColor: theme.colors.primary200,
  },
  ratingSummaryDone: {
    backgroundColor: theme.colors.successSurface,
    borderColor: theme.colors.success,
  },
});
