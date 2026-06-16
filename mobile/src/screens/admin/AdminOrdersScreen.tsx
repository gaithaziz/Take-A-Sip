import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { EmptyState } from '@/components/EmptyState';
import { AdminPageSection } from '@/components/admin/AdminPageSection';
import { InfoLine } from '@/components/admin/InfoLine';
import { ListPageSkeleton } from '@/components/skeleton/PageSkeletons';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { RootStackParamList } from '@/navigation/types';
import { adminService } from '@/services/adminService';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { OrderRead } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { formatCurrency, formatDateTime, toNumber } from '@/utils/format';
import { mirroredRow } from '@/utils/layout';
import { isFinalDeliveredStatus } from '@/utils/orderStatus';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminOrders'>;
type OrderStatusFilter = 'ALL' | OrderRead['status'];
type OrderTypeFilter = 'all' | OrderRead['order_type'];

const PAGE_SIZE = 25;
const STATUS_FILTERS: OrderStatusFilter[] = [
  'ALL',
  'NEW',
  'ACCEPTED',
  'ASSIGNED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
];

const getStatusTone = (status: OrderRead['status']) => {
  if (status === 'CANCELLED') return 'error';
  if (isFinalDeliveredStatus(status)) return 'success';
  if (status === 'NEW' || status === 'ACCEPTED') return 'warning';
  return 'info';
};

export const AdminOrdersScreen = ({ navigation }: Props) => {
  const { t, language } = useAppTranslation();
  const { isRTL } = useLanguage();
  const [orders, setOrders] = useState<OrderRead[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const requestParams = useMemo(
    () => ({
      status: statusFilter === 'ALL' ? undefined : [statusFilter],
      order_type: typeFilter === 'all' ? undefined : typeFilter,
      search: debouncedSearch || undefined,
    }),
    [debouncedSearch, statusFilter, typeFilter],
  );

  useEffect(() => {
    const handle = setTimeout(() => {
      const nextSearch = searchInput.trim();
      setDebouncedSearch((current) => {
        if (current === nextSearch) {
          return current;
        }
        setPageIndex(0);
        return nextSearch;
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const load = useCallback(
    async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await adminService.listLatestOrders({
          ...requestParams,
          limit: PAGE_SIZE,
          offset: pageIndex * PAGE_SIZE,
        });
        setOrders(data.orders);
        setHasMore(data.orders.length === PAGE_SIZE);
      } catch (e) {
        setError(getApiErrorMessage(e, t));
      } finally {
        setLoading(false);
      }
    },
    [pageIndex, requestParams, t],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const selectStatusFilter = (status: OrderStatusFilter) => {
    setStatusFilter(status);
    setPageIndex(0);
  };

  const selectTypeFilter = (type: OrderTypeFilter) => {
    setTypeFilter(type);
    setPageIndex(0);
  };

  const goToPreviousPage = () => {
    if (pageIndex > 0 && !loading) {
      setPageIndex((current) => Math.max(0, current - 1));
    }
  };

  const goToNextPage = () => {
    if (hasMore && !loading) {
      setPageIndex((current) => current + 1);
    }
  };

  if (loading && orders.length === 0) {
    return <ListPageSkeleton isRTL={isRTL} showFilters cards={4} />;
  }

  if (error && orders.length === 0) {
    return <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={() => void load()} />;
  }

  return (
    <AppShell refreshing={loading} onRefresh={() => void load()} resetScrollKey={`${statusFilter}-${typeFilter}-${debouncedSearch}-${pageIndex}`}>
      <View style={styles.headingBlock}>
        <AppText variant="h1">{t('admin.allOrdersTitle')}</AppText>
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          {t('admin.allOrdersSubtitle')}
        </AppText>
      </View>

      <AdminPageSection title={t('admin.orderFilters')}>
        <View style={styles.filterStack}>
          <AppInput
            label={t('admin.searchOrders')}
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder={t('admin.searchOrdersPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          <View style={[styles.chipRow, mirroredRow(isRTL)]}>
            {STATUS_FILTERS.map((status) => (
              <AppButton
                key={status}
                title={status === 'ALL' ? t('admin.filterAll') : t(`status.${status}`)}
                variant={statusFilter === status ? 'primary' : 'secondary'}
                textVariant="caption"
                fullWidth={false}
                style={styles.filterButton}
                onPress={() => selectStatusFilter(status)}
              />
            ))}
          </View>
          <View style={[styles.chipRow, mirroredRow(isRTL)]}>
            {(['all', 'pickup', 'delivery'] as OrderTypeFilter[]).map((type) => (
              <AppButton
                key={type}
                title={
                  type === 'all'
                    ? t('admin.orderTypeAll')
                    : type === 'pickup'
                      ? t('admin.orderTypePickup')
                      : t('admin.orderTypeDelivery')
                }
                variant={typeFilter === type ? 'primary' : 'secondary'}
                textVariant="caption"
                fullWidth={false}
                style={styles.filterButton}
                onPress={() => selectTypeFilter(type)}
              />
            ))}
          </View>
        </View>
      </AdminPageSection>

      <AdminPageSection title={t('admin.allOrdersTitle')}>
        <View style={[styles.paginationRow, mirroredRow(isRTL)]}>
          <AppButton
            title={t('admin.previousPage')}
            variant="secondary"
            onPress={goToPreviousPage}
            disabled={pageIndex === 0 || loading}
            fullWidth={false}
            style={styles.paginationButton}
          />
          <AppText variant="bodySmall" color={theme.colors.textSecondary} align="center" style={styles.pageLabel}>
            {`${t('admin.pageLabel')} ${pageIndex + 1}`}
          </AppText>
          <AppButton
            title={t('admin.nextPage')}
            variant="secondary"
            onPress={goToNextPage}
            disabled={!hasMore || loading}
            fullWidth={false}
            style={styles.paginationButton}
          />
        </View>
        {orders.length === 0 ? (
          <EmptyState title={t('admin.allOrdersTitle')} subtitle={t('admin.noOrdersMatchFilters')} />
        ) : (
          <View style={styles.stack}>
            {orders.map((order) => (
              <Pressable
                key={order.id}
                accessibilityRole="button"
                accessibilityLabel={`${t('admin.viewOrderDetails')} #${order.order_number}`}
                onPress={() => navigation.navigate('AdminOrderDetails', { orderId: order.id })}>
                {({ pressed }) => (
                  <AppCard style={[styles.orderCard, pressed && styles.orderCardPressed]}>
                    <View style={styles.cardHeader}>
                      <View style={styles.titleBlock}>
                        <AppText variant="h3">#{order.order_number}</AppText>
                        <AppText variant="caption" color={theme.colors.textSecondary}>
                          {formatDateTime(order.created_at, language)}
                        </AppText>
                      </View>
                      <BadgeChip label={t(`status.${order.status}`)} tone={getStatusTone(order.status)} />
                    </View>

                    <View style={styles.badgeRow}>
                      <BadgeChip
                        label={order.order_type === 'pickup' ? t('admin.orderTypePickup') : t('admin.orderTypeDelivery')}
                        tone="default"
                      />
                      <BadgeChip label={formatCurrency(toNumber(order.total_amount ?? 0), language)} tone="success" />
                    </View>

                    <View style={styles.infoBox}>
                      <InfoLine label={t('admin.usersTitle')} value={order.customer_name || '-'} numberOfLines={1} />
                      <InfoLine label={t('profile.phone')} value={order.customer_phone || '-'} numberOfLines={1} />
                      <InfoLine label={t('admin.driversTitle')} value={order.assigned_driver_name || order.assigned_driver_phone || t('admin.none')} numberOfLines={1} />
                      {order.order_type === 'delivery' ? (
                        <InfoLine label={t('checkout.deliveryAddress')} value={order.delivery_address_text || order.delivery_address || '-'} numberOfLines={2} />
                      ) : null}
                      {order.notes ? <InfoLine label={t('common.notes')} value={order.notes} numberOfLines={2} /> : null}
                    </View>
                    <AppText variant="caption" color={theme.colors.primary700} align="right">
                      {t('admin.viewOrderDetails')}
                    </AppText>
                  </AppCard>
                )}
              </Pressable>
            ))}
            {error ? (
              <AppText variant="bodySmall" color={theme.colors.error}>
                {error}
              </AppText>
            ) : null}
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
  filterStack: {
    gap: theme.spacing.sm,
  },
  chipRow: {
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  filterButton: {
    minHeight: 40,
    paddingHorizontal: theme.spacing.md,
  },
  stack: {
    gap: theme.spacing.sm,
  },
  paginationRow: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  paginationButton: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: theme.spacing.sm,
  },
  pageLabel: {
    minWidth: 72,
  },
  orderCard: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
  },
  orderCardPressed: {
    opacity: 0.82,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  titleBlock: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  infoBox: {
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
  },
});
