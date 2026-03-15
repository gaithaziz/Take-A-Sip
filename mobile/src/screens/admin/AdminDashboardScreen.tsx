import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
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
import { formatCurrency, formatDateTime, toNumber } from '@/utils/format';
import { OrderRead } from '@/types/api';

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
  const [orderAnalytics, setOrderAnalytics] = useState({
    totalOrdersToday: 0,
    pickupOrdersToday: 0,
    deliveryOrdersToday: 0,
    pickupDeliveryRatio: '0:0',
    averageOrderValue: 0,
  });
  const [driverAnalytics, setDriverAnalytics] = useState<{
    deliveriesCompletedToday: number;
    deliveriesPerDriver: Array<{ driver_id: string; driver_name: string; deliveries_completed_today: number }>;
  }>({
    deliveriesCompletedToday: 0,
    deliveriesPerDriver: [],
  });
  const [ratingsSummary, setRatingsSummary] = useState({
    averageRating: 0,
    totalRatings: 0,
    starsBreakdown: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 } as Record<string, number>,
  });
  const [recentRatings, setRecentRatings] = useState<
    Array<{ order_id: string; stars: number; note?: string | null; customer_name: string; created_at: string }>
  >([]);
  const [latestOrders, setLatestOrders] = useState<OrderRead[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [menu, promotions, loyalty, users, dashboardAnalytics, ratingsResponse, latestOrdersResponse] = await Promise.all([
        adminService.getMenuTree(),
        adminService.listPromotions(),
        adminService.listLoyaltyRules(),
        adminService.listUsers(),
        adminService.getDashboardAnalytics(),
        adminService.listRatings(5),
        adminService.listLatestOrders({ limit: 5 }),
      ]);
      setStats({
        sections: menu.sections.length,
        promotions: promotions.promotions.length,
        loyaltyRules: loyalty.rules.length,
        users: users.users.length,
      });
      setRevenue({
        today: toNumber(dashboardAnalytics.revenue.today_revenue),
        week: toNumber(dashboardAnalytics.revenue.week_revenue),
        month: toNumber(dashboardAnalytics.revenue.month_revenue),
        todayOrders: dashboardAnalytics.revenue.today_orders,
        weekOrders: dashboardAnalytics.revenue.week_orders,
        monthOrders: dashboardAnalytics.revenue.month_orders,
      });
      setOrderAnalytics({
        totalOrdersToday: dashboardAnalytics.orders.total_orders_today,
        pickupOrdersToday: dashboardAnalytics.orders.pickup_orders_today,
        deliveryOrdersToday: dashboardAnalytics.orders.delivery_orders_today,
        pickupDeliveryRatio: dashboardAnalytics.orders.pickup_delivery_ratio,
        averageOrderValue: toNumber(dashboardAnalytics.orders.average_order_value),
      });
      setDriverAnalytics({
        deliveriesCompletedToday: dashboardAnalytics.drivers.deliveries_completed_today,
        deliveriesPerDriver: dashboardAnalytics.drivers.deliveries_per_driver,
      });
      setRatingsSummary({
        averageRating: dashboardAnalytics.ratings.average_rating,
        totalRatings: dashboardAnalytics.ratings.total_ratings,
        starsBreakdown: dashboardAnalytics.ratings.stars_breakdown,
      });
      setRecentRatings(ratingsResponse.ratings);
      setLatestOrders(latestOrdersResponse.orders);
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
      <View style={styles.headingBlock}>
        <AppText variant="h1">{t('admin.dashboardTitle')}</AppText>
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          {t('admin.tapToOpen')}
        </AppText>
      </View>

      <AdminPageSection title={t('admin.quickActions')}>
        <View style={[styles.grid, isCompact ? styles.gridCompact : null]}>
          <Pressable
            onPress={() => navigation.navigate('AdminMenu')}
            style={({ pressed }) => (pressed ? styles.pressed : null)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t('admin.menuSections')}>
            <AppCard style={styles.cardInteractive}>
              <View style={[styles.cardHeader, mirroredRow(isRTL)]}>
                <View style={[styles.iconWrap, mirroredRow(isRTL)]}>
                  <Ionicons name="restaurant" size={18} color={theme.colors.primary600} />
                </View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={theme.colors.textMuted} />
              </View>
              <AppText variant="h3" numberOfLines={2}>{t('admin.menuSections')}</AppText>
              <View style={[styles.statRow, mirroredRow(isRTL)]}>
                <AppText variant="h1">{stats.sections}</AppText>
                <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.tapToOpen')}</AppText>
              </View>
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
                <View style={[styles.iconWrap, mirroredRow(isRTL)]}>
                  <Ionicons name="pricetag" size={18} color={theme.colors.primary600} />
                </View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={theme.colors.textMuted} />
              </View>
              <AppText variant="h3" numberOfLines={2}>{t('admin.promotionsTitle')}</AppText>
              <View style={[styles.statRow, mirroredRow(isRTL)]}>
                <AppText variant="h1">{stats.promotions}</AppText>
                <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.tapToOpen')}</AppText>
              </View>
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
                <View style={[styles.iconWrap, mirroredRow(isRTL)]}>
                  <Ionicons name="gift" size={18} color={theme.colors.primary600} />
                </View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={theme.colors.textMuted} />
              </View>
              <AppText variant="h3" numberOfLines={2}>{t('admin.loyaltyTitle')}</AppText>
              <View style={[styles.statRow, mirroredRow(isRTL)]}>
                <AppText variant="h1">{stats.loyaltyRules}</AppText>
                <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.tapToOpen')}</AppText>
              </View>
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
                <View style={[styles.iconWrap, mirroredRow(isRTL)]}>
                  <Ionicons name="people" size={18} color={theme.colors.primary600} />
                </View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={theme.colors.textMuted} />
              </View>
              <AppText variant="h3" numberOfLines={2}>{t('admin.usersTitle')}</AppText>
              <View style={[styles.statRow, mirroredRow(isRTL)]}>
                <AppText variant="h1">{stats.users}</AppText>
                <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.tapToOpen')}</AppText>
              </View>
            </AppCard>
          </Pressable>

          <Pressable
            onPress={() => navigateToAdminStackScreen('AdminProfile')}
            style={({ pressed }) => (pressed ? styles.pressed : null)}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t('admin.profileTitle')}>
            <AppCard style={styles.cardInteractive}>
              <View style={[styles.cardHeader, mirroredRow(isRTL)]}>
                <View style={[styles.iconWrap, mirroredRow(isRTL)]}>
                  <Ionicons name="person-circle-outline" size={18} color={theme.colors.primary600} />
                </View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={theme.colors.textMuted} />
              </View>
              <AppText variant="h3" numberOfLines={2}>{t('admin.profileTitle')}</AppText>
              <View style={[styles.statRow, mirroredRow(isRTL)]}>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>{t('admin.tapToOpen')}</AppText>
              </View>
            </AppCard>
          </Pressable>
        </View>
      </AdminPageSection>

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

      <AdminPageSection title={t('admin.ordersAnalyticsTitle')}>
        <View style={[styles.revenueRow, isCompact ? styles.revenueRowCompact : null]}>
          <View style={styles.revenueItem}>
            <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.totalOrdersToday')}</AppText>
            <AppText variant="h3">{orderAnalytics.totalOrdersToday}</AppText>
          </View>
          <View style={styles.revenueItem}>
            <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.pickupDeliveryRatio')}</AppText>
            <AppText variant="h3">{orderAnalytics.pickupDeliveryRatio}</AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>
              {`${orderAnalytics.pickupOrdersToday}/${orderAnalytics.deliveryOrdersToday}`}
            </AppText>
          </View>
          <View style={styles.revenueItem}>
            <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.averageOrderValue')}</AppText>
            <AppText variant="h3">{formatCurrency(orderAnalytics.averageOrderValue, language)}</AppText>
          </View>
        </View>
      </AdminPageSection>

      <AdminPageSection title={t('admin.driverAnalyticsTitle')}>
        <View style={[styles.revenueRow, isCompact ? styles.revenueRowCompact : null]}>
          <View style={styles.revenueItem}>
            <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.deliveriesCompletedToday')}</AppText>
            <AppText variant="h3">{driverAnalytics.deliveriesCompletedToday}</AppText>
          </View>
        </View>
        <View style={styles.reviewsWrap}>
          {driverAnalytics.deliveriesPerDriver.length === 0 ? (
            <AppCard>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                {t('admin.noDriverDeliveries')}
              </AppText>
            </AppCard>
          ) : (
            driverAnalytics.deliveriesPerDriver.map((driver) => (
              <AppCard key={driver.driver_id} style={styles.reviewCard}>
                <View style={[styles.cardHeader, mirroredRow(isRTL)]}>
                  <AppText variant="h3">{driver.driver_name}</AppText>
                  <AppText variant="caption" color={theme.colors.textSecondary}>
                    {driver.deliveries_completed_today}
                  </AppText>
                </View>
              </AppCard>
            ))
          )}
        </View>
      </AdminPageSection>

      <AdminPageSection title={t('admin.latestOrdersTitle')}>
        <View style={styles.reviewsWrap}>
          {latestOrders.length === 0 ? (
            <AppCard>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                {t('admin.noLatestOrders')}
              </AppText>
            </AppCard>
          ) : (
            latestOrders.map((order) => (
              <AppCard key={order.id} style={styles.reviewCard}>
                <View style={[styles.cardHeader, mirroredRow(isRTL)]}>
                  <AppText variant="h3">#{order.order_number}</AppText>
                  <BadgeChip label={t(`status.${order.status}`)} tone={order.status === 'COMPLETED' ? 'success' : order.status === 'CANCELLED' ? 'error' : 'warning'} />
                </View>
                <View style={[styles.breakdownLine, mirroredRow(isRTL)]}>
                  <AppText variant="caption" color={theme.colors.textSecondary}>
                    {formatDateTime(order.created_at, language)}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.textSecondary}>
                    {order.order_type}
                  </AppText>
                </View>
              </AppCard>
            ))
          )}
        </View>
      </AdminPageSection>

      <AdminPageSection title={t('admin.ratingsOverviewTitle')}>
        <View style={[styles.revenueRow, isCompact ? styles.revenueRowCompact : null]}>
          <View style={styles.revenueItem}>
            <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.averageRating')}</AppText>
            <AppText variant="h3">{ratingsSummary.averageRating.toFixed(1)}</AppText>
          </View>
          <View style={styles.revenueItem}>
            <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.totalRatings')}</AppText>
            <AppText variant="h3">{ratingsSummary.totalRatings}</AppText>
          </View>
          <View style={styles.revenueItem}>
            <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.recentReviews')}</AppText>
            <View style={styles.breakdownWrap}>
              {[5, 4, 3, 2, 1].map((stars) => (
                <View key={`stars-${stars}`} style={[styles.breakdownLine, mirroredRow(isRTL)]}>
                  <AppText variant="caption">{`${stars}★`}</AppText>
                  <AppText variant="caption" color={theme.colors.textSecondary}>
                    {ratingsSummary.starsBreakdown[String(stars)] ?? 0}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.reviewsWrap}>
          {recentRatings.length === 0 ? (
            <AppCard>
              <AppText variant="h3">{t('admin.noReviewsTitle')}</AppText>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                {t('admin.noReviewsSubtitle')}
              </AppText>
            </AppCard>
          ) : (
            recentRatings.map((rating) => (
              <AppCard key={`${rating.order_id}-${rating.created_at}`} style={styles.reviewCard}>
                <View style={[styles.cardHeader, mirroredRow(isRTL)]}>
                  <AppText variant="h3">{rating.customer_name}</AppText>
                  <AppText variant="caption" color={theme.colors.textSecondary}>
                    {formatDateTime(rating.created_at, language)}
                  </AppText>
                </View>
                <AppText variant="bodySmall">{`${'★'.repeat(rating.stars)}${'☆'.repeat(5 - rating.stars)}`}</AppText>
                {rating.note ? (
                  <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                    {rating.note}
                  </AppText>
                ) : null}
              </AppCard>
            ))
          )}
        </View>
      </AdminPageSection>

    </AppShell>
  );
};

const styles = StyleSheet.create({
  headingBlock: {
    gap: theme.spacing.xs,
  },
  grid: {
    gap: theme.spacing.md,
  },
  gridCompact: {
    gap: theme.spacing.sm,
  },
  cardInteractive: {
    borderColor: theme.colors.primary200,
    backgroundColor: theme.colors.secondaryCream,
    gap: theme.spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  revenueRow: {
    gap: theme.spacing.md,
  },
  revenueRowCompact: {
    gap: theme.spacing.sm,
  },
  revenueItem: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  pressed: {
    opacity: 0.8,
  },
  breakdownWrap: {
    gap: theme.spacing.xs,
  },
  breakdownLine: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewsWrap: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  reviewCard: {
    gap: theme.spacing.xs,
  },
});
