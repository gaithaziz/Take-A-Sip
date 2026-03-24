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
import { OrderRead } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { formatCurrency, formatDateTime, toNumber } from '@/utils/format';
import { mirroredRow } from '@/utils/layout';

type Props = BottomTabScreenProps<AdminTabParamList, 'AdminDashboard'>;

type QuickAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onPress: () => void;
};

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

  const navigateToAdminStackScreen = (screen: 'AdminLoyalty' | 'AdminProfile') => {
    navigation.getParent()?.navigate(screen as never);
  };

  const quickActions = useMemo<QuickAction[]>(
    () => [
      {
        key: 'menu',
        label: t('admin.menuSections'),
        icon: 'restaurant',
        value: String(stats.sections),
        onPress: () => navigation.navigate('AdminMenu'),
      },
      {
        key: 'promotions',
        label: t('admin.promotionsTitle'),
        icon: 'pricetag',
        value: String(stats.promotions),
        onPress: () => navigation.navigate('AdminPromotions'),
      },
      {
        key: 'loyalty',
        label: t('admin.loyaltyTitle'),
        icon: 'gift',
        value: String(stats.loyaltyRules),
        onPress: () => navigateToAdminStackScreen('AdminLoyalty'),
      },
      {
        key: 'scheduling',
        label: t('admin.schedulingTitle'),
        icon: 'calendar',
        value: orderAnalytics.totalOrdersToday ? orderAnalytics.pickupDeliveryRatio : t('admin.none'),
        onPress: () => navigation.navigate('AdminScheduling'),
      },
      {
        key: 'staff',
        label: t('admin.staffTitle'),
        icon: 'people-circle',
        value: String(driverAnalytics.deliveriesPerDriver.length),
        onPress: () => navigation.navigate('AdminStaff'),
      },
      {
        key: 'users',
        label: t('admin.usersTitle'),
        icon: 'people',
        value: String(stats.users),
        onPress: () => navigation.navigate('AdminUsers'),
      },
      {
        key: 'delivery',
        label: t('admin.deliveryTitle'),
        icon: 'bicycle',
        value: String(orderAnalytics.deliveryOrdersToday),
        onPress: () => navigation.navigate('AdminDelivery'),
      },
      {
        key: 'profile',
        label: t('admin.profileTitle'),
        icon: 'person-circle-outline',
        value: t('admin.tapToOpen'),
        onPress: () => navigateToAdminStackScreen('AdminProfile'),
      },
    ],
    [driverAnalytics.deliveriesPerDriver.length, navigation, orderAnalytics.deliveryOrdersToday, orderAnalytics.pickupDeliveryRatio, orderAnalytics.totalOrdersToday, stats.loyaltyRules, stats.promotions, stats.sections, stats.users, t],
  );

  const attentionItems = useMemo(() => {
    const items: string[] = [];
    if (stats.promotions === 0) items.push(t('admin.attentionNoPromotions'));
    if (stats.loyaltyRules === 0) items.push(t('admin.attentionNoLoyaltyRules'));
    if (latestOrders.length === 0) items.push(t('admin.attentionNoRecentOrders'));
    if (ratingsSummary.totalRatings === 0) items.push(t('admin.attentionNoRatings'));
    return items;
  }, [latestOrders.length, ratingsSummary.totalRatings, stats.loyaltyRules, stats.promotions, t]);

  const revenueCards = useMemo(
    () => [
      { key: 'today', label: t('admin.revenueToday'), value: formatCurrency(revenue.today, language), meta: `${revenue.todayOrders} ${t('admin.ordersCountLabel')}` },
      { key: 'week', label: t('admin.revenue7Days'), value: formatCurrency(revenue.week, language), meta: `${revenue.weekOrders} ${t('admin.ordersCountLabel')}` },
      { key: 'month', label: t('admin.revenue30Days'), value: formatCurrency(revenue.month, language), meta: `${revenue.monthOrders} ${t('admin.ordersCountLabel')}` },
    ],
    [language, revenue.month, revenue.monthOrders, revenue.today, revenue.todayOrders, revenue.week, revenue.weekOrders, t],
  );

  const kpiCards = useMemo(
    () => [
      { key: 'orders', label: t('admin.totalOrdersToday'), value: String(orderAnalytics.totalOrdersToday), meta: orderAnalytics.pickupDeliveryRatio },
      { key: 'average', label: t('admin.averageOrderValue'), value: formatCurrency(orderAnalytics.averageOrderValue, language), meta: `${orderAnalytics.pickupOrdersToday}/${orderAnalytics.deliveryOrdersToday}` },
      { key: 'deliveries', label: t('admin.deliveriesCompletedToday'), value: String(driverAnalytics.deliveriesCompletedToday), meta: t('admin.driverAnalyticsTitle') },
      { key: 'rating', label: t('admin.averageRating'), value: `${ratingsSummary.averageRating.toFixed(1)} / 5`, meta: `${ratingsSummary.totalRatings} ${t('admin.totalRatings').toLowerCase()}` },
    ],
    [driverAnalytics.deliveriesCompletedToday, language, orderAnalytics.averageOrderValue, orderAnalytics.deliveryOrdersToday, orderAnalytics.pickupOrdersToday, orderAnalytics.pickupDeliveryRatio, orderAnalytics.totalOrdersToday, ratingsSummary.averageRating, ratingsSummary.totalRatings, t],
  );

  const latestOrdersPreview = latestOrders.slice(0, 3);
  const recentRatingsPreview = recentRatings.slice(0, 3);
  const driverPreview = driverAnalytics.deliveriesPerDriver.slice(0, 3);

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

      <AdminPageSection title={t('admin.quickActions')} subtitle={t('admin.tapToOpen')}>
        <View style={[styles.quickActionsGrid, isCompact ? styles.quickActionsGridCompact : null]}>
          {quickActions.map((action) => (
            <Pressable
              key={action.key}
              onPress={action.onPress}
              style={({ pressed }) => [styles.quickActionPressable, pressed ? styles.pressed : null]}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={action.label}>
              <AppCard style={styles.quickActionCard}>
                <View style={[styles.quickActionHeader, mirroredRow(isRTL)]}>
                  <View style={styles.iconWrap}>
                    <Ionicons name={action.icon} size={18} color={theme.colors.primary600} />
                  </View>
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={theme.colors.textMuted} />
                </View>
                <AppText variant="h3" numberOfLines={2}>
                  {action.label}
                </AppText>
                <AppText variant="bodySmall" color={theme.colors.textSecondary} numberOfLines={2}>
                  {action.value}
                </AppText>
              </AppCard>
            </Pressable>
          ))}
        </View>
      </AdminPageSection>

      <AdminPageSection title={t('admin.revenueSummary')}>
        <View style={[styles.cardGrid, isCompact ? styles.cardGridCompact : null]}>
          {revenueCards.map((card) => (
            <AppCard key={card.key} style={styles.metricCard}>
              <AppText variant="caption" color={theme.colors.textSecondary}>
                {card.label}
              </AppText>
              <AppText variant="h3">{card.value}</AppText>
              <AppText variant="caption" color={theme.colors.textSecondary}>
                {card.meta}
              </AppText>
            </AppCard>
          ))}
        </View>
      </AdminPageSection>

      <AdminPageSection title={t('admin.attentionTitle')}>
        {attentionItems.length === 0 ? (
          <AppCard style={styles.healthyCard}>
            <AppText variant="h3">{t('admin.healthyStateTitle')}</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {t('admin.healthyStateSubtitle')}
            </AppText>
          </AppCard>
        ) : (
          <View style={styles.stack}>
            {attentionItems.map((item) => (
              <AppCard key={item} style={styles.attentionCard}>
                <View style={[styles.inlineRow, mirroredRow(isRTL)]}>
                  <Ionicons name="alert-circle-outline" size={18} color={theme.colors.warning} />
                  <AppText variant="bodySmall" style={styles.grow}>
                    {item}
                  </AppText>
                </View>
              </AppCard>
            ))}
          </View>
        )}
      </AdminPageSection>

      <AdminPageSection title={t('admin.ordersAnalyticsTitle')}>
        <View style={[styles.cardGrid, isCompact ? styles.cardGridCompact : null]}>
          {kpiCards.map((card) => (
            <AppCard key={card.key} style={styles.metricCard}>
              <AppText variant="caption" color={theme.colors.textSecondary}>
                {card.label}
              </AppText>
              <AppText variant="h3">{card.value}</AppText>
              <AppText variant="caption" color={theme.colors.textSecondary}>
                {card.meta}
              </AppText>
            </AppCard>
          ))}
        </View>
      </AdminPageSection>

      <AdminPageSection title={t('admin.driverAnalyticsTitle')}>
        {driverPreview.length === 0 ? (
          <AppCard>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {t('admin.noDriverDeliveries')}
            </AppText>
          </AppCard>
        ) : (
          <View style={styles.stack}>
            {driverPreview.map((driver) => (
              <AppCard key={driver.driver_id} style={styles.listCard}>
                <View style={[styles.inlineRow, mirroredRow(isRTL)]}>
                  <AppText variant="h3" style={styles.grow}>
                    {driver.driver_name}
                  </AppText>
                  <BadgeChip label={String(driver.deliveries_completed_today)} tone="info" />
                </View>
              </AppCard>
            ))}
          </View>
        )}
      </AdminPageSection>

      <AdminPageSection title={t('admin.latestOrdersTitle')}>
        {latestOrdersPreview.length === 0 ? (
          <AppCard>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {t('admin.noLatestOrders')}
            </AppText>
          </AppCard>
        ) : (
          <View style={styles.stack}>
            {latestOrdersPreview.map((order) => (
              <AppCard key={order.id} style={styles.listCard}>
                <View style={[styles.inlineRow, mirroredRow(isRTL)]}>
                  <AppText variant="h3">#{order.order_number}</AppText>
                  <BadgeChip
                    label={t(`status.${order.status}`)}
                    tone={order.status === 'COMPLETED' ? 'success' : order.status === 'CANCELLED' ? 'error' : 'warning'}
                  />
                </View>
                <View style={[styles.inlineRow, mirroredRow(isRTL)]}>
                  <AppText variant="caption" color={theme.colors.textSecondary}>
                    {formatDateTime(order.created_at, language)}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.textSecondary}>
                    {order.order_type}
                  </AppText>
                </View>
              </AppCard>
            ))}
          </View>
        )}
      </AdminPageSection>

      <AdminPageSection title={t('admin.ratingsOverviewTitle')}>
        <View style={[styles.cardGrid, isCompact ? styles.cardGridCompact : null]}>
          <AppCard style={styles.metricCard}>
            <AppText variant="caption" color={theme.colors.textSecondary}>
              {t('admin.averageRating')}
            </AppText>
            <AppText variant="h3">{`${ratingsSummary.averageRating.toFixed(1)} / 5`}</AppText>
          </AppCard>
          <AppCard style={styles.metricCard}>
            <AppText variant="caption" color={theme.colors.textSecondary}>
              {t('admin.totalRatings')}
            </AppText>
            <AppText variant="h3">{ratingsSummary.totalRatings}</AppText>
          </AppCard>
          <AppCard style={styles.metricCard}>
            <AppText variant="caption" color={theme.colors.textSecondary}>
              {t('admin.recentReviews')}
            </AppText>
            <View style={styles.breakdownWrap}>
              {[5, 4, 3, 2, 1].map((stars) => (
                <View key={`stars-${stars}`} style={[styles.inlineRow, mirroredRow(isRTL)]}>
                  <AppText variant="caption">{`${stars}/5`}</AppText>
                  <AppText variant="caption" color={theme.colors.textSecondary}>
                    {ratingsSummary.starsBreakdown[String(stars)] ?? 0}
                  </AppText>
                </View>
              ))}
            </View>
          </AppCard>
        </View>

        {recentRatingsPreview.length === 0 ? (
          <AppCard>
            <AppText variant="h3">{t('admin.noReviewsTitle')}</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {t('admin.noReviewsSubtitle')}
            </AppText>
          </AppCard>
        ) : (
          <View style={styles.stack}>
            {recentRatingsPreview.map((rating) => (
              <AppCard key={`${rating.order_id}-${rating.created_at}`} style={styles.listCard}>
                <View style={[styles.inlineRow, mirroredRow(isRTL)]}>
                  <AppText variant="h3" style={styles.grow}>
                    {rating.customer_name}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.textSecondary}>
                    {formatDateTime(rating.created_at, language)}
                  </AppText>
                </View>
                <AppText variant="bodySmall">{`${rating.stars}/5`}</AppText>
                {rating.note ? (
                  <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                    {rating.note}
                  </AppText>
                ) : null}
              </AppCard>
            ))}
          </View>
        )}
      </AdminPageSection>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  headingBlock: {
    gap: theme.spacing.xs,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  quickActionsGridCompact: {
    gap: theme.spacing.sm,
  },
  quickActionPressable: {
    width: '48%',
  },
  quickActionCard: {
    gap: theme.spacing.sm,
    minHeight: 132,
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
  },
  quickActionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  cardGrid: {
    gap: theme.spacing.md,
  },
  cardGridCompact: {
    gap: theme.spacing.sm,
  },
  metricCard: {
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
  },
  healthyCard: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.successSurface,
    borderColor: theme.colors.success,
  },
  attentionCard: {
    backgroundColor: theme.colors.warningSurface,
    borderColor: theme.colors.warning,
  },
  stack: {
    gap: theme.spacing.sm,
  },
  listCard: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
  },
  inlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  grow: {
    flex: 1,
  },
  breakdownWrap: {
    gap: theme.spacing.xs,
  },
  pressed: {
    opacity: 0.8,
  },
});
