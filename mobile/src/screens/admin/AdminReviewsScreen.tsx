import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { ListPageSkeleton } from '@/components/skeleton/PageSkeletons';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { RootStackParamList } from '@/navigation/types';
import { adminService } from '@/services/adminService';
import { theme } from '@/theme';
import { AdminRatingReview } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { formatDateTime } from '@/utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminReviews'>;

const PAGE_SIZE = 20;

export const AdminReviewsScreen = ({ navigation }: Props) => {
  const { t, language } = useAppTranslation();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<AdminRatingReview[]>([]);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(
    async (offset = 0, reset = false) => {
      try {
        if (reset) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        setError(null);
        const response = await adminService.listRatings(PAGE_SIZE, offset);
        setReviews((current) => (reset ? response.ratings : [...current, ...response.ratings]));
        setHasMore(response.ratings.length === PAGE_SIZE);
      } catch (e) {
        setError(getApiErrorMessage(e, t));
      } finally {
        if (reset) {
          setLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [t],
  );

  useEffect(() => {
    void load(0, true);
  }, [load]);

  const refresh = () => {
    void load(0, true);
  };

  const loadMore = () => {
    if (loading || loadingMore || !hasMore) {
      return;
    }
    void load(reviews.length, false);
  };

  if (loading) {
    return <ListPageSkeleton isRTL={false} cards={4} />;
  }

  if (error) {
    return <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={refresh} />;
  }

  return (
    <AppShell refreshing={loading} onRefresh={refresh}>
      <AppButton title={t('common.goBack')} variant="ghost" fullWidth={false} onPress={() => navigation.goBack()} />
      <View style={styles.headingBlock}>
        <AppText variant="h1">{t('admin.reviewsTitle')}</AppText>
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          {t('admin.reviewsSubtitle')}
        </AppText>
      </View>

      {reviews.length === 0 ? (
        <AppCard>
          <AppText variant="h3">{t('admin.noReviewsTitle')}</AppText>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            {t('admin.noReviewsSubtitle')}
          </AppText>
        </AppCard>
      ) : (
        <View style={styles.stack}>
          {reviews.map((review) => (
            <AppCard key={`${review.order_id}-${review.created_at}`} style={styles.listCard}>
              <View style={styles.inlineRow}>
                <AppText variant="h3" style={styles.grow}>
                  {review.customer_name}
                </AppText>
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  {formatDateTime(review.created_at, language)}
                </AppText>
              </View>
              <AppText variant="bodySmall">{`${review.stars}/5`}</AppText>
              {review.note ? (
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                  {review.note}
                </AppText>
              ) : null}
            </AppCard>
          ))}
          {hasMore ? (
            <AppButton
              title={t('admin.showMore')}
              variant="secondary"
              onPress={loadMore}
              loading={loadingMore}
              disabled={loadingMore}
            />
          ) : null}
        </View>
      )}
    </AppShell>
  );
};

const styles = StyleSheet.create({
  headingBlock: {
    gap: theme.spacing.xs,
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
});
