import { FlatList, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
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
  t,
}: PastOrdersScreenViewProps) => {
  const data = loading || error ? [] : orders;

  return (
    <FlatList
      data={data}
      keyExtractor={(order) => order.id}
      renderItem={({ item: order }) => (
        <AppCard style={styles.card}>
          <View style={[styles.top, mirroredRow(isRTL)]}>
            <View style={styles.orderMeta}>
              <AppText variant="h3">#{order.order_number}</AppText>
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

          <AppButton
            title={reorderLabel}
            variant="secondary"
            loading={reorderingId === order.id}
            onPress={() => onReorder(order)}
          />
        </AppCard>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <AppText variant="h1">{title}</AppText>
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <PastOrdersListSkeleton isRTL={isRTL} />
        ) : error ? (
          <EmptyState title={retryLabel} subtitle={error} actionLabel={retryLabel} onAction={onReload} />
        ) : (
          <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
        )
      }
      refreshing={loading}
      onRefresh={onReload}
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
});
