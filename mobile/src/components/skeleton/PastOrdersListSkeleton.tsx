import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';
import { mirroredRow } from '@/utils/layout';

import { AppCard } from '../AppCard';
import { SkeletonBlock } from './SkeletonBlock';

type PastOrdersListSkeletonProps = {
  isRTL: boolean;
  cards?: number;
};

export const PastOrdersListSkeleton = ({ isRTL, cards = 3 }: PastOrdersListSkeletonProps) => {
  return (
    <View style={styles.wrap}>
      {Array.from({ length: cards }).map((_, index) => (
        <AppCard key={`orders-skeleton-${index}`} style={styles.card}>
          <View style={[styles.topRow, mirroredRow(isRTL)]}>
            <View style={styles.orderMeta}>
              <SkeletonBlock width={112} height={22} radius={theme.radius.sm} />
              <SkeletonBlock width={140} height={14} radius={theme.radius.sm} />
            </View>
            <SkeletonBlock width={78} height={26} radius={theme.radius.pill} />
          </View>

          <View style={styles.itemsWrap}>
            <View style={[styles.itemLine, mirroredRow(isRTL)]}>
              <SkeletonBlock width="58%" height={14} radius={theme.radius.sm} />
              <SkeletonBlock width={74} height={12} radius={theme.radius.sm} />
            </View>
            <View style={[styles.itemLine, mirroredRow(isRTL)]}>
              <SkeletonBlock width="52%" height={14} radius={theme.radius.sm} />
              <SkeletonBlock width={62} height={12} radius={theme.radius.sm} />
            </View>
          </View>

          <SkeletonBlock width="100%" height={54} radius={theme.radius.md} />
        </AppCard>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    gap: theme.spacing.md,
  },
  card: {
    gap: theme.spacing.sm,
  },
  topRow: {
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
});
