import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { AdminPageSection } from '@/components/admin/AdminPageSection';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { AdminTabParamList } from '@/navigation/types';
import { adminService } from '@/services/adminService';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { mirroredRow } from '@/utils/layout';
import { getApiErrorMessage } from '@/utils/errors';
import { formatCurrency, toNumber } from '@/utils/format';

type Props = BottomTabScreenProps<AdminTabParamList, 'AdminDashboard'>;

export const AdminDashboardScreen = ({ navigation }: Props) => {
  const { t, language } = useAppTranslation();
  const { isRTL } = useLanguage();
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ sections: 0, promotions: 0, loyaltyRules: 0, users: 0 });
  const [revenue, setRevenue] = useState({
    today: 0,
    week: 0,
    month: 0,
    todayOrders: 0,
    weekOrders: 0,
    monthOrders: 0,
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [menu, promotions, loyalty, users, revenueSummary] = await Promise.all([
        adminService.getMenuTree(),
        adminService.listPromotions(),
        adminService.listLoyaltyRules(),
        adminService.listUsers(),
        adminService.listRevenueSummary(),
      ]);
      setStats({
        sections: menu.sections.length,
        promotions: promotions.promotions.length,
        loyaltyRules: loyalty.rules.length,
        users: users.users.length,
      });
      setRevenue({
        today: toNumber(revenueSummary.today_revenue),
        week: toNumber(revenueSummary.week_revenue),
        month: toNumber(revenueSummary.month_revenue),
        todayOrders: revenueSummary.today_orders,
        weekOrders: revenueSummary.week_orders,
        monthOrders: revenueSummary.month_orders,
      });
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const trends = useMemo(
    () => ({
      today: `${revenue.todayOrders} ${t('admin.ordersCountLabel')}`,
      week: `${revenue.weekOrders} ${t('admin.ordersCountLabel')}`,
      month: `${revenue.monthOrders} ${t('admin.ordersCountLabel')}`,
    }),
    [revenue, t],
  );

  const navigateToAdminStackScreen = (screen: 'AdminLoyalty' | 'AdminProfile') => {
    navigation.getParent()?.navigate(screen as never);
  };

  if (loading) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (error) {
    return <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={load} />;
  }

  return (
    <AppShell refreshing={loading} onRefresh={load}>
      <AppText variant="h1">{t('admin.dashboardTitle')}</AppText>

      <View style={[styles.grid, isCompact ? styles.gridCompact : null]}>
        <Pressable
          onPress={() => navigation.navigate('AdminMenu')}
          style={({ pressed }) => (pressed ? styles.pressed : null)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t('admin.menuSections')}>
          <AppCard style={styles.cardInteractive}>
            <View style={[styles.cardHeader, mirroredRow(isRTL)]}>
              <AppText variant="h3" numberOfLines={2}>{t('admin.menuSections')}</AppText>
              <Ionicons name="restaurant" size={18} color={theme.colors.primary600} />
            </View>
            <AppText variant="display">{stats.sections}</AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.tapToOpen')}</AppText>
          </AppCard>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('AdminPromotions')}
          style={({ pressed }) => (pressed ? styles.pressed : null)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t('admin.promotionsTitle')}>
          <AppCard style={styles.cardInteractive}>
            <View style={[styles.cardHeader, mirroredRow(isRTL)]}>
              <AppText variant="h3" numberOfLines={2}>{t('admin.promotionsTitle')}</AppText>
              <Ionicons name="pricetag" size={18} color={theme.colors.primary600} />
            </View>
            <AppText variant="display">{stats.promotions}</AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.tapToOpen')}</AppText>
          </AppCard>
        </Pressable>

        <Pressable
          onPress={() => navigateToAdminStackScreen('AdminLoyalty')}
          style={({ pressed }) => (pressed ? styles.pressed : null)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t('admin.loyaltyTitle')}>
          <AppCard style={styles.cardInteractive}>
            <View style={[styles.cardHeader, mirroredRow(isRTL)]}>
              <AppText variant="h3" numberOfLines={2}>{t('admin.loyaltyTitle')}</AppText>
              <Ionicons name="gift" size={18} color={theme.colors.primary600} />
            </View>
            <AppText variant="display">{stats.loyaltyRules}</AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.tapToOpen')}</AppText>
          </AppCard>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('AdminUsers')}
          style={({ pressed }) => (pressed ? styles.pressed : null)}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t('admin.usersTitle')}>
          <AppCard style={styles.cardInteractive}>
            <View style={[styles.cardHeader, mirroredRow(isRTL)]}>
              <AppText variant="h3" numberOfLines={2}>{t('admin.usersTitle')}</AppText>
              <Ionicons name="people" size={18} color={theme.colors.primary600} />
            </View>
            <AppText variant="display">{stats.users}</AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.tapToOpen')}</AppText>
          </AppCard>
        </Pressable>
      </View>

      <AdminPageSection title={t('admin.revenueSummary')}>
        <View style={[styles.revenueRow, isCompact ? styles.revenueRowCompact : null]}>
          <View style={styles.revenueItem}>
            <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.revenueToday')}</AppText>
            <AppText variant="h3" numberOfLines={2}>{formatCurrency(revenue.today, language)}</AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>{trends.today}</AppText>
          </View>
          <View style={styles.revenueItem}>
            <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.revenue7Days')}</AppText>
            <AppText variant="h3" numberOfLines={2}>{formatCurrency(revenue.week, language)}</AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>{trends.week}</AppText>
          </View>
          <View style={styles.revenueItem}>
            <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.revenue30Days')}</AppText>
            <AppText variant="h3" numberOfLines={2}>{formatCurrency(revenue.month, language)}</AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>{trends.month}</AppText>
          </View>
        </View>
      </AdminPageSection>

      <AdminPageSection title={t('admin.quickActions')}>
        <View style={[styles.quickActionsRow, mirroredRow(isRTL)]}>
          <Pressable
            onPress={() => navigateToAdminStackScreen('AdminLoyalty')}
            style={({ pressed }) => [styles.quickActionButton, pressed ? styles.pressed : null]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t('admin.loyaltyTitle')}>
            <Ionicons name="gift-outline" size={theme.iconSizes.md} color={theme.colors.primary600} />
            <AppText variant="bodySmall" numberOfLines={1}>
              {t('admin.loyaltyTitle')}
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => navigateToAdminStackScreen('AdminProfile')}
            style={({ pressed }) => [styles.quickActionButton, pressed ? styles.pressed : null]}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t('admin.profileTitle')}>
            <Ionicons name="person-circle-outline" size={theme.iconSizes.md} color={theme.colors.primary600} />
            <AppText variant="bodySmall" numberOfLines={1}>
              {t('admin.profileTitle')}
            </AppText>
          </Pressable>
        </View>
      </AdminPageSection>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  grid: {
    gap: theme.spacing.md,
  },
  gridCompact: {
    gap: theme.spacing.sm,
  },
  cardInteractive: {
    borderColor: theme.colors.primary200,
    backgroundColor: theme.colors.secondaryCream,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  revenueRow: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  revenueRowCompact: {
    gap: theme.spacing.sm,
  },
  revenueItem: {
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  quickActionsRow: {
    gap: theme.spacing.sm,
  },
  quickActionButton: {
    flex: 1,
    minWidth: 0,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
  },
  pressed: {
    opacity: 0.8,
  },
});
