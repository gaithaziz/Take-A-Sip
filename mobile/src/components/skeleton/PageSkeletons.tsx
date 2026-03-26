import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';
import { mirroredRow } from '@/utils/layout';

import { AppCard } from '../AppCard';
import { AppShell } from '../AppShell';
import { SkeletonBlock } from './SkeletonBlock';

type BaseSkeletonProps = {
  isRTL: boolean;
  shell?: boolean;
};

type ListPageSkeletonProps = BaseSkeletonProps & {
  cards?: number;
  showFilters?: boolean;
  showHero?: boolean;
};

type DetailPageSkeletonProps = BaseSkeletonProps & {
  sections?: number;
};

const wrapWithShell = (shell: boolean | undefined, content: ReactNode) => {
  if (shell === false) {
    return <View style={styles.inlineWrap}>{content}</View>;
  }

  return <AppShell>{content}</AppShell>;
};

export const ListPageSkeleton = ({ isRTL, shell = true, cards = 4, showFilters = false, showHero = true }: ListPageSkeletonProps) =>
  wrapWithShell(
    shell,
    <View style={styles.stack}>
      {showHero ? (
        <View style={styles.headerStack}>
          <SkeletonBlock width={168} height={30} radius={theme.radius.sm} />
          <SkeletonBlock width="62%" height={16} radius={theme.radius.sm} />
        </View>
      ) : null}

      {showFilters ? (
        <AppCard style={styles.filterCard}>
          <SkeletonBlock width="100%" height={52} radius={theme.radius.md} />
          <View style={[styles.badgeRow, mirroredRow(isRTL)]}>
            <SkeletonBlock width={88} height={24} radius={theme.radius.pill} />
            <SkeletonBlock width={96} height={24} radius={theme.radius.pill} />
            <SkeletonBlock width={86} height={24} radius={theme.radius.pill} />
          </View>
          <View style={[styles.buttonRow, mirroredRow(isRTL)]}>
            <SkeletonBlock width="31%" height={44} radius={theme.radius.md} />
            <SkeletonBlock width="31%" height={44} radius={theme.radius.md} />
            <SkeletonBlock width="31%" height={44} radius={theme.radius.md} />
          </View>
        </AppCard>
      ) : null}

      {Array.from({ length: cards }).map((_, index) => (
        <AppCard key={`list-skeleton-${index}`} style={styles.listCard}>
          <View style={[styles.listHeaderRow, mirroredRow(isRTL)]}>
            <View style={styles.listTitleBlock}>
              <SkeletonBlock width="68%" height={20} radius={theme.radius.sm} />
              <SkeletonBlock width="42%" height={14} radius={theme.radius.sm} />
            </View>
            <SkeletonBlock width={78} height={24} radius={theme.radius.pill} />
          </View>
          <View style={styles.infoBox}>
            <SkeletonBlock width="82%" height={14} radius={theme.radius.sm} />
            <SkeletonBlock width="56%" height={14} radius={theme.radius.sm} />
          </View>
          <View style={[styles.buttonRow, mirroredRow(isRTL)]}>
            <SkeletonBlock width="48%" height={44} radius={theme.radius.md} />
            <SkeletonBlock width="48%" height={44} radius={theme.radius.md} />
          </View>
        </AppCard>
      ))}
    </View>,
  );

export const DetailPageSkeleton = ({ isRTL, shell = true, sections = 3 }: DetailPageSkeletonProps) =>
  wrapWithShell(
    shell,
    <View style={styles.stack}>
      <View style={[styles.listHeaderRow, mirroredRow(isRTL)]}>
        <SkeletonBlock width={92} height={26} radius={theme.radius.pill} />
        <SkeletonBlock width={84} height={26} radius={theme.radius.pill} />
      </View>

      <View style={styles.headerStack}>
        <SkeletonBlock width={132} height={28} radius={theme.radius.sm} />
        <SkeletonBlock width="48%" height={16} radius={theme.radius.sm} />
      </View>

      {Array.from({ length: sections }).map((_, index) => (
        <AppCard key={`detail-skeleton-${index}`} style={styles.detailCard}>
          <SkeletonBlock width="38%" height={22} radius={theme.radius.sm} />
          <View style={styles.detailRows}>
            <View style={[styles.listHeaderRow, mirroredRow(isRTL)]}>
              <SkeletonBlock width="30%" height={14} radius={theme.radius.sm} />
              <SkeletonBlock width="24%" height={14} radius={theme.radius.sm} />
            </View>
            <View style={[styles.listHeaderRow, mirroredRow(isRTL)]}>
              <SkeletonBlock width="46%" height={14} radius={theme.radius.sm} />
              <SkeletonBlock width="20%" height={14} radius={theme.radius.sm} />
            </View>
            <SkeletonBlock width="100%" height={54} radius={theme.radius.md} />
          </View>
        </AppCard>
      ))}
    </View>,
  );

export const DashboardPageSkeleton = ({ isRTL, shell = true }: BaseSkeletonProps) =>
  wrapWithShell(
    shell,
    <View style={styles.stack}>
      <View style={styles.headerStack}>
        <SkeletonBlock width={192} height={30} radius={theme.radius.sm} />
        <SkeletonBlock width="58%" height={16} radius={theme.radius.sm} />
      </View>

      <View style={styles.grid}>
        {Array.from({ length: 4 }).map((_, index) => (
          <AppCard key={`dashboard-top-${index}`} style={styles.metricCard}>
            <View style={[styles.listHeaderRow, mirroredRow(isRTL)]}>
              <SkeletonBlock width={30} height={30} radius={theme.radius.sm} />
              <SkeletonBlock width={16} height={16} radius={theme.radius.sm} />
            </View>
            <SkeletonBlock width="72%" height={18} radius={theme.radius.sm} />
            <SkeletonBlock width="34%" height={14} radius={theme.radius.sm} />
          </AppCard>
        ))}
      </View>

      {Array.from({ length: 4 }).map((_, sectionIndex) => (
        <View key={`dashboard-section-${sectionIndex}`} style={styles.sectionBlock}>
          <SkeletonBlock width={154} height={22} radius={theme.radius.sm} />
          <View style={styles.grid}>
            {Array.from({ length: 2 }).map((_, cardIndex) => (
              <AppCard key={`dashboard-card-${sectionIndex}-${cardIndex}`} style={styles.metricCard}>
                <SkeletonBlock width="46%" height={14} radius={theme.radius.sm} />
                <SkeletonBlock width="64%" height={20} radius={theme.radius.sm} />
                <SkeletonBlock width="54%" height={14} radius={theme.radius.sm} />
              </AppCard>
            ))}
          </View>
          <AppCard style={styles.detailCard}>
            <View style={[styles.listHeaderRow, mirroredRow(isRTL)]}>
              <SkeletonBlock width="36%" height={18} radius={theme.radius.sm} />
              <SkeletonBlock width={78} height={24} radius={theme.radius.pill} />
            </View>
            <View style={styles.detailRows}>
              <SkeletonBlock width="100%" height={16} radius={theme.radius.sm} />
              <SkeletonBlock width="86%" height={16} radius={theme.radius.sm} />
              <SkeletonBlock width="72%" height={16} radius={theme.radius.sm} />
            </View>
          </AppCard>
        </View>
      ))}
    </View>,
  );

const styles = StyleSheet.create({
  inlineWrap: {
    gap: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  stack: {
    gap: theme.spacing.lg,
  },
  headerStack: {
    gap: theme.spacing.xs,
  },
  filterCard: {
    gap: theme.spacing.md,
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
  },
  badgeRow: {
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  buttonRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  listCard: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
  },
  listHeaderRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  listTitleBlock: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  infoBox: {
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
  },
  detailCard: {
    gap: theme.spacing.md,
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
  },
  detailRows: {
    gap: theme.spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  metricCard: {
    width: '48%',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
  },
  sectionBlock: {
    gap: theme.spacing.md,
  },
});
