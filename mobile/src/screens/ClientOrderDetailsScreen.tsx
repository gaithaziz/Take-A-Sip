import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { RootStackParamList } from '@/navigation/types';
import { orderService } from '@/services/orderService';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { OrderRead } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { formatDateTime } from '@/utils/format';
import { mirroredRow } from '@/utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'ClientOrderDetails'>;

const statusToneMap = {
  NEW: 'warning',
  ACCEPTED: 'info',
  ASSIGNED: 'info',
  OUT_FOR_DELIVERY: 'info',
  COMPLETED: 'success',
  CANCELLED: 'error',
} as const;

export const ClientOrderDetailsScreen = ({ route, navigation }: Props) => {
  const { orderId } = route.params;
  const { t, language } = useAppTranslation();
  const { isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderRead | null>(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingNote, setRatingNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await orderService.getById(orderId);
      setOrder(data);
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }, [orderId, t]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const onSubmitRating = async () => {
    if (!order) {
      return;
    }
    if (ratingStars < 1 || ratingStars > 5) {
      Alert.alert(t('common.appName'), t('orders.ratingStarsRequired'));
      return;
    }

    try {
      setSubmitting(true);
      const rating = await orderService.submitRating(order.id, {
        stars: ratingStars,
        note: ratingNote.trim() || undefined,
      });
      setOrder({ ...order, rating });
      Alert.alert(t('common.appName'), t('orders.ratingSubmitted'));
    } catch (e) {
      Alert.alert(t('common.appName'), getApiErrorMessage(e, t));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (error || !order) {
    return (
      <EmptyState
        title={t('common.error')}
        subtitle={error ?? t('errors.generic')}
        actionLabel={t('common.retry')}
        onAction={loadOrder}
      />
    );
  }

  return (
    <AppShell>
      <View style={[styles.header, mirroredRow(isRTL)]}>
        <AppButton title={t('common.goBack')} variant="ghost" fullWidth={false} onPress={() => navigation.goBack()} />
        <BadgeChip label={t(`status.${order.status}`)} tone={statusToneMap[order.status]} />
      </View>

      <View style={styles.titleBlock}>
        <AppText variant="h1">{t('orders.detailsTitle')}</AppText>
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          #{order.order_number} - {formatDateTime(order.created_at, language)}
        </AppText>
      </View>

      <AppCard style={styles.card}>
        {order.items.map((line) => (
          <View key={line.id} style={styles.lineWrap}>
            <View style={[styles.lineTop, mirroredRow(isRTL)]}>
              <AppText variant="h3">{line.item_name_snapshot}</AppText>
              <AppText variant="caption" color={theme.colors.textSecondary}>
                {line.quantity}x
              </AppText>
            </View>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {line.size_snapshot}
            </AppText>
          </View>
        ))}
      </AppCard>

      {order.status === 'COMPLETED' ? (
        <AppCard style={styles.card}>
          <AppText variant="h3">{t('orders.rateOrder')}</AppText>
          {order.rating ? (
            <View style={styles.readOnlyRating}>
              <View style={[styles.starRow, mirroredRow(isRTL)]}>
                {Array.from({ length: 5 }, (_, index) => (
                  <Ionicons
                    key={`readonly-star-${index}`}
                    name={index < order.rating!.stars ? 'star' : 'star-outline'}
                    size={20}
                    color={theme.colors.warning}
                  />
                ))}
              </View>
              {order.rating.note ? (
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                  {order.rating.note}
                </AppText>
              ) : null}
            </View>
          ) : (
            <View style={styles.rateWrap}>
              <View style={[styles.starRow, mirroredRow(isRTL)]}>
                {Array.from({ length: 5 }, (_, index) => {
                  const starValue = index + 1;
                  return (
                    <Pressable
                      key={`input-star-${starValue}`}
                      onPress={() => setRatingStars(starValue)}
                      testID={`rating-star-${starValue}`}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={`${t('orders.rateOrder')} ${starValue}`}>
                      <Ionicons
                        name={starValue <= ratingStars ? 'star' : 'star-outline'}
                        size={24}
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
                value={ratingNote}
                onChangeText={setRatingNote}
              />
              <AppButton
                title={t('orders.submitRating')}
                testID="order-details-submit-rating"
                loading={submitting}
                onPress={onSubmitRating}
              />
            </View>
          )}
        </AppCard>
      ) : null}
    </AppShell>
  );
};

const styles = StyleSheet.create({
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleBlock: {
    gap: theme.spacing.xs,
  },
  card: {
    gap: theme.spacing.sm,
  },
  lineWrap: {
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  lineTop: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  readOnlyRating: {
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.warningSurface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rateWrap: {
    gap: theme.spacing.sm,
  },
  starRow: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
});
