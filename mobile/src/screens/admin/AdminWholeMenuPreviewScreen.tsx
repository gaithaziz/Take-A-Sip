import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { ListPageSkeleton } from '@/components/skeleton/PageSkeletons';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { RootStackParamList } from '@/navigation/types';
import { adminService } from '@/services/adminService';
import { HomeScreenView } from '@/screens/home/HomeScreenView';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { LanguageCode, MenuSchedule, Promotion, Section } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import {
  applyPreviewSchedulesToMenu,
  buildHomeMenuSections,
  mergePreviewPromotion,
} from '@/utils/adminMenuPreview';
import { mirroredRow } from '@/utils/layout';

type PreviewRoute = RouteProp<RootStackParamList, 'AdminWholeMenuPreview'>;

const isPromotionVisible = (promotion: Promotion, draftPromotion?: Promotion) => {
  if (draftPromotion?.id === promotion.id) return true;
  const now = Date.now();
  const startsAt = new Date(promotion.starts_at).getTime();
  const endsAt = new Date(promotion.ends_at).getTime();
  return promotion.is_active && now >= startsAt && now <= endsAt;
};

export const AdminWholeMenuPreviewScreen = () => {
  const { t, language } = useAppTranslation();
  const { isRTL } = useLanguage();
  const route = useRoute<PreviewRoute>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [previewLanguage, setPreviewLanguage] = useState<LanguageCode>(route.params?.initialLanguage ?? language);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [schedules, setSchedules] = useState<MenuSchedule[]>([]);

  const draftPromotion = route.params?.draftPromotion;
  const draftSchedules = route.params?.draftSchedules ?? [];

  const load = useCallback(
    async (asRefresh = false) => {
      try {
        asRefresh ? setRefreshing(true) : setLoading(true);
        setError(null);
        const [menuResponse, promotionResponse, scheduleResponse] = await Promise.all([
          adminService.getMenuTree(),
          adminService.listPromotions(),
          adminService.listSchedules(),
        ]);
        setSections(menuResponse.sections);
        setPromotions(promotionResponse.promotions);
        setSchedules(scheduleResponse.schedules);
      } catch (e) {
        setError(getApiErrorMessage(e, t));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const visiblePromotions = useMemo(() => {
    const merged = mergePreviewPromotion(promotions, draftPromotion);
    return merged.filter((promotion) => isPromotionVisible(promotion, draftPromotion));
  }, [draftPromotion, promotions]);

  const previewSchedules = useMemo(() => {
    const draftIds = new Set(draftSchedules.map((schedule) => schedule.id));
    return [...schedules.filter((schedule) => !draftIds.has(schedule.id)), ...draftSchedules];
  }, [draftSchedules, schedules]);

  const menuSections = useMemo(() => {
    const filtered = applyPreviewSchedulesToMenu(sections, previewSchedules);
    return buildHomeMenuSections(filtered, previewLanguage);
  }, [previewLanguage, previewSchedules, sections]);

  const previewIsRTL = previewLanguage === 'ar';

  if (loading && sections.length === 0) {
    return <ListPageSkeleton isRTL={isRTL} cards={4} />;
  }

  if (error && sections.length === 0) {
    return <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={() => void load()} />;
  }

  return (
    <View style={styles.page}>
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.sm }]}>
        <View style={[styles.headerRow, mirroredRow(isRTL)]}>
          <View style={styles.headerText}>
            <AppText variant="h3" align={isRTL ? 'right' : 'left'}>
              {t('admin.previewWholeMenu')}
            </AppText>
            <AppText variant="caption" color={theme.colors.textSecondary} align={isRTL ? 'right' : 'left'}>
              {t('admin.previewReadOnly')}
            </AppText>
          </View>
          <AppButton title={t('common.back')} variant="ghost" fullWidth={false} onPress={() => navigation.goBack()} />
        </View>
        <View style={[styles.toggleRow, mirroredRow(isRTL)]}>
          <AppButton
            title={t('common.languageEnglish')}
            variant={previewLanguage === 'en' ? 'primary' : 'secondary'}
            fullWidth={false}
            style={styles.toggleButton}
            onPress={() => setPreviewLanguage('en')}
          />
          <AppButton
            title={t('common.languageArabic')}
            variant={previewLanguage === 'ar' ? 'primary' : 'secondary'}
            fullWidth={false}
            style={styles.toggleButton}
            onPress={() => setPreviewLanguage('ar')}
          />
        </View>
      </View>

      <View style={styles.previewBody}>
        <HomeScreenView
          menuSections={menuSections}
          offers={visiblePromotions}
          loading={loading}
          refreshing={refreshing}
          error={error}
          cartCount={0}
          isRTL={previewIsRTL}
          topInset={0}
          bottomInset={insets.bottom}
          t={t}
          onReload={() => void load(true)}
          onOpenCart={() => undefined}
          onOpenProduct={() => undefined}
          previewLanguage={previewLanguage}
          previewIsRTL={previewIsRTL}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  headerText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  toggleButton: {
    flex: 1,
  },
  previewBody: {
    flex: 1,
  },
});
