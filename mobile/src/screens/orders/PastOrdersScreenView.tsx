import { Ionicons } from '@expo/vector-icons';
import { FlatList, StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { EmptyState } from '@/components/EmptyState';
import { PastOrdersListSkeleton } from '@/components/skeleton/PastOrdersListSkeleton';
import { theme } from '@/theme';
import { OrderRead } from '@/types/api';
import { formatDateTime } from '@/utils/format';
import { mirroredRow } from '@/utils/layout';

const statusToneMap = {
  NEW: 'warning',
  ACCEPTED: 'info',
  ASSIGNED: 'info',
  OUT_FOR_DELIVERY: 'info',
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
  ratingStarsByOrder: Record<string, number>;
  ratingNotesByOrder: Record<string, string>;
  ratingExpandedByOrder: Record<string, boolean>;
  submittingRatingId: string | null;
  topInset: number;
  bottomInset: number;
  onReload: () => void;
  onReorder: (order: OrderRead) => void;
  onToggleRating: (orderId: string, expanded: boolean) => void;
  onSelectRatingStars: (orderId: string, stars: number) => void;
  onChangeRatingNote: (orderId: string, note: string) => void;
  onSubmitRating: (order: OrderRead) => void;
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
  ratingStarsByOrder,
  ratingNotesByOrder,
  ratingExpandedByOrder,
  submittingRatingId,
  topInset,
  bottomInset,
  onReload,
  onReorder,
  onToggleRating,
  onSelectRatingStars,
  onChangeRatingNote,
  onSubmitRating,
  onOpenDetails,
  t,
}: PastOrdersScreenViewProps) => {
  const data = orders;

  return (
    <FlatList
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

          {order.status === 'COMPLETED' ? (
            <View style={styles.ratingWrap}>
              {order.rating ? (
                <View style={[styles.ratedRow, mirroredRow(isRTL)]}>
                  <View style={[styles.starRow, mirroredRow(isRTL)]}>
                    {Array.from({ length: 5 }, (_, index) => (
                      <Ionicons
                        key={`${order.id}-rated-star-${index}`}
                        name={index < order.rating!.stars ? 'star' : 'star-outline'}
                        size={16}
                        color={theme.colors.warning}
                      />
                    ))}
                  </View>
                  <AppText variant="caption" color={theme.colors.textSecondary}>
                    {t('orders.rated')}
                  </AppText>
                </View>
              ) : ratingExpandedByOrder[order.id] ? (
                <View style={styles.rateForm}>
                  <AppText variant="caption" color={theme.colors.textSecondary}>
                    {t('orders.rateOrder')}
                  </AppText>
                  <View style={[styles.starRow, mirroredRow(isRTL)]}>
                    {Array.from({ length: 5 }, (_, index) => {
                      const starValue = index + 1;
                      const selectedStars = ratingStarsByOrder[order.id] ?? 0;
                      return (
                        <Pressable
                          key={`${order.id}-star-${starValue}`}
                          onPress={() => onSelectRatingStars(order.id, starValue)}
                          hitSlop={6}
                          accessibilityRole="button"
                          accessibilityLabel={`${t('orders.rateOrder')} ${starValue}`}>
                          <Ionicons
                            name={starValue <= selectedStars ? 'star' : 'star-outline'}
                            size={22}
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
                    value={ratingNotesByOrder[order.id] ?? ''}
                    onChangeText={(value) => onChangeRatingNote(order.id, value)}
                  />
                  <View style={[styles.ratingActions, mirroredRow(isRTL)]}>
                    <AppButton
                      title={t('common.cancel')}
                      variant="ghost"
                      fullWidth={false}
                      onPress={() => onToggleRating(order.id, false)}
                    />
                    <AppButton
                      title={t('orders.submitRating')}
                      fullWidth={false}
                      loading={submittingRatingId === order.id}
                      onPress={() => onSubmitRating(order)}
                    />
                  </View>
                </View>
              ) : (
                <AppButton
                  title={t('orders.rateOrder')}
                  variant="ghost"
                  onPress={() => onToggleRating(order.id, true)}
                />
              )}
            </View>
          ) : null}

          <AppButton
            title={reorderLabel}
            variant="secondary"
            loading={reorderingId === order.id}
            onPress={() => onReorder(order)}
          />

          <AppButton
            title={t('orders.viewDetails')}
            variant="ghost"
            onPress={() => onOpenDetails(order.id)}
          />
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
  ratingWrap: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  ratedRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.colors.warningSurface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rateForm: {
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.secondaryCream,
  },
  starRow: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  ratingActions: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
});
