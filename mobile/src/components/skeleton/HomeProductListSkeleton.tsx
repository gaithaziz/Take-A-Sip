import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';
import { mirroredRow } from '@/utils/layout';

import { AppCard } from '../AppCard';
import { SkeletonBlock } from './SkeletonBlock';

type HomeProductListSkeletonProps = {
  isRTL: boolean;
  cards?: number;
};

export const HomeProductListSkeleton = ({ isRTL, cards = 4 }: HomeProductListSkeletonProps) => {
  return (
    <View style={styles.wrap}>
      <View style={[styles.sectionHeader, mirroredRow(isRTL)]}>
        <SkeletonBlock width={124} height={26} radius={theme.radius.sm} />
        <SkeletonBlock width={28} height={16} radius={theme.radius.sm} />
      </View>

      {Array.from({ length: cards }).map((_, index) => (
        <AppCard key={`home-skeleton-${index}`} style={styles.card}>
          <View style={[styles.cardRow, mirroredRow(isRTL)]}>
            <SkeletonBlock width={112} height={112} radius={theme.radius.md} />
            <View style={styles.cardContent}>
              <SkeletonBlock width="72%" height={20} radius={theme.radius.sm} />
              <SkeletonBlock width="100%" height={14} radius={theme.radius.sm} />
              <SkeletonBlock width="66%" height={14} radius={theme.radius.sm} />
              <SkeletonBlock width={86} height={20} radius={theme.radius.sm} />
              <View style={[styles.footerRow, mirroredRow(isRTL)]}>
                <SkeletonBlock width={30} height={6} radius={theme.radius.pill} />
                <SkeletonBlock width={16} height={10} radius={theme.radius.sm} />
              </View>
            </View>
          </View>
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
    borderColor: theme.colors.primary100,
  },
  sectionHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardRow: {
    alignItems: 'stretch',
    gap: theme.spacing.lg,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  footerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.xs,
  },
});
