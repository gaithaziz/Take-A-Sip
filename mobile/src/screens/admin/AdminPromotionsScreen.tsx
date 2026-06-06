import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { EmptyState } from '@/components/EmptyState';
import { ActionRow } from '@/components/admin/ActionRow';
import { ExpandableText } from '@/components/admin/ExpandableText';
import { InfoLine } from '@/components/admin/InfoLine';
import { ListPageSkeleton } from '@/components/skeleton/PageSkeletons';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { RootStackParamList } from '@/navigation/types';
import { adminService } from '@/services/adminService';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { Promotion } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { formatDateTimeWithZone, getCurrentTimeZone } from '@/utils/format';
import { getLocalizedValue } from '@/utils/i18n';
import { mirroredRow } from '@/utils/layout';

type AdminPromotionsNavigation = NativeStackNavigationProp<RootStackParamList>;
type PromotionFilter = 'all' | 'live' | 'upcoming' | 'expired' | 'inactive';

const buildOfferSummary = (parts: Array<string | null | undefined>) => parts.filter(Boolean).join(' | ');

const getPromotionState = (promotion: Promotion): PromotionFilter => {
  if (!promotion.is_active) return 'inactive';
  const now = Date.now();
  const startsAt = new Date(promotion.starts_at).getTime();
  const endsAt = new Date(promotion.ends_at).getTime();
  if (now < startsAt) return 'upcoming';
  if (now > endsAt) return 'expired';
  return 'live';
};

const behaviorLabelFor = (promotion: Promotion, t: (key: string) => string) =>
  promotion.type === 'BUY_N_GET_M_FREE'
    ? t('admin.offerBehaviorBuyGet')
    : promotion.type === 'FREE_DELIVERY_ABOVE_AMOUNT'
      ? t('admin.offerBehaviorFreeDelivery')
      : t('admin.offerBehaviorDiscount');

const ruleValueFor = (promotion: Promotion, t: (key: string) => string) =>
  promotion.type === 'BUY_N_GET_M_FREE'
    ? `${t('admin.buyQuantity')} ${promotion.buy_quantity ?? 0}, ${t('admin.freeQuantity')} ${promotion.free_quantity ?? 0}`
    : promotion.type === 'FREE_DELIVERY_ABOVE_AMOUNT'
      ? promotion.free_delivery_mode === 'PERCENTAGE_DISCOUNT'
        ? `${t('admin.percentageDiscount')} ${promotion.free_delivery_discount_percent ?? '0'}% | ${t('admin.minimumOrderAmount')} ${promotion.value}`
        : `${t('admin.freeDelivery')} | ${t('admin.minimumOrderAmount')} ${promotion.value}`
      : `${t('admin.discountAmount')} ${promotion.value}`;

export const AdminPromotionsScreen = () => {
  const { t, language } = useAppTranslation();
  const { isRTL } = useLanguage();
  const navigation = useNavigation<AdminPromotionsNavigation>();
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<PromotionFilter>('all');
  const [mutatingPromotionId, setMutatingPromotionId] = useState<string | null>(null);
  const timezone = getCurrentTimeZone();

  const load = useCallback(
    async (asRefresh = false) => {
      try {
        asRefresh ? setRefreshing(true) : setLoading(true);
        setError(null);
        const promotionResponse = await adminService.listPromotions();
        setPromotions(promotionResponse.promotions);
      } catch (e) {
        setError(getApiErrorMessage(e, t));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filteredPromotions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return promotions.filter((promotion) => {
      const state = getPromotionState(promotion);
      if (filter !== 'all' && state !== filter) return false;
      if (!normalized) return true;
      return [
        promotion.title_en,
        promotion.title_ar,
        promotion.scope_summary_en,
        promotion.scope_summary_ar,
        promotion.eligibility_summary_en,
        promotion.eligibility_summary_ar,
      ].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [filter, promotions, query]);

  const togglePromotion = async (promotion: Promotion) => {
    const state = getPromotionState(promotion);
    const run = async () => {
      try {
        setMutatingPromotionId(promotion.id);
        await adminService.togglePromotion(promotion.id);
        await load(true);
      } catch (e) {
        Alert.alert(t('common.error'), getApiErrorMessage(e, t));
      } finally {
        setMutatingPromotionId(null);
      }
    };

    if (state === 'live') {
      Alert.alert(promotion.is_active ? t('admin.disable') : t('admin.enable'), t('admin.liveOfferToggleConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), onPress: () => void run() },
      ]);
      return;
    }

    await run();
  };

  const filterOptions: Array<{ value: PromotionFilter; label: string }> = [
    { value: 'all', label: t('admin.allPromotions') },
    { value: 'live', label: t('admin.liveNow') },
    { value: 'upcoming', label: t('admin.upcoming') },
    { value: 'expired', label: t('admin.expired') },
    { value: 'inactive', label: t('admin.inactive') },
  ];

  if (loading && promotions.length === 0) return <ListPageSkeleton isRTL={isRTL} showFilters cards={4} />;
  if (error && promotions.length === 0) return <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={() => void load()} />;

  return (
    <AppShell refreshing={refreshing} onRefresh={() => void load(true)}>
      <View style={styles.heading}>
        <View style={[styles.titleRow, mirroredRow(isRTL)]}>
          <View style={styles.titleText}>
            <AppText variant="h1" align={isRTL ? 'right' : 'left'}>{t('admin.promotionsTitle')}</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary} align={isRTL ? 'right' : 'left'}>
              {t('admin.promotionsBrowseSubtitle')}
            </AppText>
          </View>
          <AppButton
            title={t('admin.addPromotion')}
            fullWidth={false}
            onPress={() => navigation.navigate('AdminPromotionEditor')}
            style={styles.addButton}
          />
        </View>
        <AppButton
          title={t('admin.previewWholeMenu')}
          variant="secondary"
          onPress={() => navigation.navigate('AdminWholeMenuPreview', { initialLanguage: language })}
        />
      </View>

      <View style={styles.controls}>
        <AppInput
          label={t('admin.searchPromotions')}
          value={query}
          onChangeText={setQuery}
          placeholder={t('admin.searchPromotionsPlaceholder')}
        />
        <View style={[styles.filterRow, mirroredRow(isRTL)]}>
          {filterOptions.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.filterChip, filter === option.value ? styles.filterChipActive : null]}
              onPress={() => setFilter(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === option.value }}
              accessibilityLabel={option.label}>
              <AppText variant="caption" color={filter === option.value ? theme.colors.primary700 : theme.colors.textSecondary}>
                {option.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      </View>

      {filteredPromotions.length === 0 ? (
        <EmptyState title={t('admin.noPromotionsTitle')} subtitle={t('admin.noPromotionsSubtitle')} />
      ) : (
        <View style={styles.stack}>
          {filteredPromotions.map((promotion) => {
            const state = getPromotionState(promotion);
            const scopeSummary = language === 'ar' ? promotion.scope_summary_ar : promotion.scope_summary_en;
            const eligibilitySummary = language === 'ar' ? promotion.eligibility_summary_ar : promotion.eligibility_summary_en;
            const cardSummary = buildOfferSummary([
              behaviorLabelFor(promotion, t),
              ruleValueFor(promotion, t),
              eligibilitySummary,
              scopeSummary,
            ]);

            return (
              <AppCard key={promotion.id} style={styles.card}>
                <View style={[styles.cardHeader, mirroredRow(isRTL)]}>
                  <View style={styles.cardTitle}>
                    <ExpandableText value={getLocalizedValue(promotion, language, 'title')} variant="h3" numberOfLines={2} />
                  </View>
                  <View style={styles.badges}>
                    <BadgeChip label={promotion.is_active ? t('admin.active') : t('admin.inactive')} tone={promotion.is_active ? 'success' : 'default'} />
                    {state === 'live' ? <BadgeChip label={t('admin.liveNow')} tone="warning" /> : null}
                    {state === 'upcoming' ? <BadgeChip label={t('admin.upcoming')} tone="info" /> : null}
                    {state === 'expired' ? <BadgeChip label={t('admin.expired')} tone="default" /> : null}
                  </View>
                </View>

                <View style={styles.infoBox}>
                  <InfoLine label={t('admin.offerSummary')} value={cardSummary} numberOfLines={3} />
                  <InfoLine
                    label={`${t('admin.dateRange')} (${timezone})`}
                    value={`${formatDateTimeWithZone(promotion.starts_at, language)} - ${formatDateTimeWithZone(promotion.ends_at, language)}`}
                    numberOfLines={2}
                  />
                </View>

                <ActionRow compact={isCompact}>
                  <AppButton
                    title={t('admin.edit')}
                    variant="secondary"
                    onPress={() => navigation.navigate('AdminPromotionEditor', { promotion })}
                    style={styles.flexButton}
                    disabled={mutatingPromotionId === promotion.id}
                  />
                  <AppButton
                    title={promotion.is_active ? t('admin.disable') : t('admin.enable')}
                    variant="ghost"
                    fullWidth={false}
                    loading={mutatingPromotionId === promotion.id}
                    disabled={Boolean(mutatingPromotionId && mutatingPromotionId !== promotion.id)}
                    onPress={() => void togglePromotion(promotion)}
                  />
                  <Pressable
                    style={styles.iconButton}
                    onPress={() => navigation.navigate('AdminWholeMenuPreview', { initialLanguage: language })}
                    accessibilityRole="button"
                    accessibilityLabel={t('admin.previewWholeMenu')}>
                    <Ionicons name="phone-portrait-outline" size={theme.iconSizes.md} color={theme.colors.primary700} />
                  </Pressable>
                </ActionRow>
              </AppCard>
            );
          })}
        </View>
      )}
    </AppShell>
  );
};

const styles = StyleSheet.create({
  heading: {
    gap: theme.spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  titleText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  addButton: {
    minWidth: 132,
  },
  controls: {
    gap: theme.spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  filterChip: {
    minHeight: 36,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
  },
  filterChipActive: {
    borderColor: theme.colors.primary300,
    backgroundColor: theme.colors.secondaryCream,
  },
  stack: {
    gap: theme.spacing.md,
  },
  card: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  cardTitle: {
    flex: 1,
  },
  badges: {
    gap: theme.spacing.xs,
    alignItems: 'flex-end',
  },
  infoBox: {
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
  },
  flexButton: {
    flex: 1,
  },
  iconButton: {
    width: 54,
    height: 54,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary200,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
