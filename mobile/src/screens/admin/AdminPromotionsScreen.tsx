import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { DateTimeField } from '@/components/DateTimeField';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ActionRow } from '@/components/admin/ActionRow';
import { AdminPageSection } from '@/components/admin/AdminPageSection';
import { BilingualFieldGroup } from '@/components/admin/BilingualFieldGroup';
import { ExpandableText } from '@/components/admin/ExpandableText';
import { InfoLine } from '@/components/admin/InfoLine';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { adminService } from '@/services/adminService';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { Promotion } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { getLocalizedValue } from '@/utils/i18n';
import { mirroredRow } from '@/utils/layout';
import { formatDateTimeWithZone, getCurrentTimeZone } from '@/utils/format';

type PromotionForm = {
  title_en: string;
  title_ar: string;
  type: string;
  value: string;
  starts_at: Date;
  ends_at: Date;
  is_active: boolean;
};

const defaultForm: PromotionForm = {
  title_en: '',
  title_ar: '',
  type: 'TEMPORARY',
  value: '',
  starts_at: new Date(),
  ends_at: new Date(Date.now() + 60 * 60 * 1000),
  is_active: true,
};

const typeOptions = ['TEMPORARY', 'FIRST_TIME', 'LOYALTY'];
const promotionTypeLabel = (type: string, t: (key: string) => string): string => {
  if (type === 'TEMPORARY') return t('admin.promoTypeTemporary');
  if (type === 'FIRST_TIME') return t('admin.promoTypeFirstTime');
  if (type === 'LOYALTY') return t('admin.promoTypeLoyalty');
  return type;
};

export const AdminPromotionsScreen = () => {
  const { t, language } = useAppTranslation();
  const { isRTL } = useLanguage();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 390;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);
  const [form, setForm] = useState<PromotionForm>(defaultForm);
  const [formErrors, setFormErrors] = useState<{ value?: string; dateRange?: string }>({});
  const [mutatingPromotionId, setMutatingPromotionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.listPromotions();
      setPromotions(response.promotions);
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setEditingPromotionId(null);
    setForm(defaultForm);
  };

  const startEdit = (promotion: Promotion) => {
    setEditingPromotionId(promotion.id);
    setForm({
      title_en: promotion.title_en,
      title_ar: promotion.title_ar,
      type: promotion.type,
      value: String(promotion.value),
      starts_at: new Date(promotion.starts_at),
      ends_at: new Date(promotion.ends_at),
      is_active: promotion.is_active,
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const nextErrors: { value?: string; dateRange?: string } = {};
    if (!form.value || Number.isNaN(Number(form.value))) {
      nextErrors.value = t('validation.requiredFields');
    }
    if (form.ends_at.getTime() <= form.starts_at.getTime()) {
      nextErrors.dateRange = t('admin.invalidDateRange');
    }
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const save = async () => {
    if (!validateForm() || !form.title_en.trim() || !form.title_ar.trim()) {
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title_en: form.title_en.trim(),
        title_ar: form.title_ar.trim(),
        type: form.type,
        value: Number(form.value),
        starts_at: form.starts_at.toISOString(),
        ends_at: form.ends_at.toISOString(),
        is_active: form.is_active,
      };

      if (editingPromotionId) {
        await adminService.updatePromotion(editingPromotionId, payload);
      } else {
        await adminService.createPromotion(payload);
      }

      resetForm();
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    } finally {
      setSaving(false);
    }
  };

  const togglePromotion = async (promotion: Promotion) => {
    try {
      setMutatingPromotionId(promotion.id);
      await adminService.togglePromotion(promotion.id);
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    } finally {
      setMutatingPromotionId(null);
    }
  };

  const sortedPromotions = useMemo(() => [...promotions].sort((a, b) => b.starts_at.localeCompare(a.starts_at)), [promotions]);
  const hasMissingTranslation = !form.title_en.trim() || !form.title_ar.trim();
  const canSave = !hasMissingTranslation && !saving && form.ends_at.getTime() > form.starts_at.getTime() && Boolean(form.value);
  const timezone = getCurrentTimeZone();

  const renderPromotion = ({ item: promotion }: { item: Promotion }) => (
    <AppCard>
      <View style={[styles.itemHeader, mirroredRow(isRTL)]}>
        <Pressable onPress={() => Alert.alert('', getLocalizedValue(promotion, language, 'title'))} style={styles.grow} accessibilityRole="button" accessibilityLabel={getLocalizedValue(promotion, language, 'title')}>
          <ExpandableText value={getLocalizedValue(promotion, language, 'title')} variant="h3" numberOfLines={2} />
        </Pressable>
        <BadgeChip label={promotion.is_active ? t('admin.active') : t('admin.inactive')} tone={promotion.is_active ? 'success' : 'default'} />
      </View>
      <InfoLine
        label={`${t('admin.dateRange')} (${timezone})`}
        value={`${formatDateTimeWithZone(promotion.starts_at, language)} - ${formatDateTimeWithZone(promotion.ends_at, language)}`}
        numberOfLines={2}
      />
      <InfoLine label={t('admin.promotionType')} value={promotionTypeLabel(promotion.type, t)} />
      <InfoLine label={t('admin.value')} value={String(promotion.value)} />
      <ActionRow compact={isCompact}>
        <AppButton title={t('admin.edit')} variant="secondary" onPress={() => startEdit(promotion)} style={styles.flexButton} disabled={mutatingPromotionId === promotion.id} />
        <AppButton
          title={promotion.is_active ? t('admin.disable') : t('admin.enable')}
          variant="ghost"
          onPress={() => void togglePromotion(promotion)}
          fullWidth={false}
          loading={mutatingPromotionId === promotion.id}
          disabled={Boolean(mutatingPromotionId && mutatingPromotionId !== promotion.id)}
        />
      </ActionRow>
    </AppCard>
  );

  return (
    <FlatList
      data={loading || error ? [] : sortedPromotions}
      keyExtractor={(promotion) => promotion.id}
      renderItem={renderPromotion}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <AppText variant="h1">{t('admin.promotionsTitle')}</AppText>

          <AdminPageSection title={editingPromotionId ? t('admin.editPromotion') : t('admin.createPromotion')}>
            <View style={styles.formStack}>
              <BilingualFieldGroup
                labelEn={t('admin.titleEn')}
                labelAr={t('admin.titleAr')}
                valueEn={form.title_en}
                valueAr={form.title_ar}
                onChangeEn={(value) => setForm((prev) => ({ ...prev, title_en: value }))}
                onChangeAr={(value) => setForm((prev) => ({ ...prev, title_ar: value }))}
                helperText={hasMissingTranslation ? t('admin.missingTranslation') : undefined}
              />

              <View>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>{t('admin.promotionType')}</AppText>
                <View style={[styles.segmentRow, mirroredRow(isRTL)]}>
                  {typeOptions.map((option) => (
                    <Pressable
                      key={option}
                      style={[styles.segmentChip, form.type === option ? styles.segmentChipActive : null]}
                      onPress={() => setForm((prev) => ({ ...prev, type: option }))}
                      accessibilityRole="button"
                      accessibilityState={{ selected: form.type === option }}
                      accessibilityLabel={`${t('admin.promotionType')}: ${promotionTypeLabel(option, t)}`}>
                      <AppText variant="caption">{promotionTypeLabel(option, t)}</AppText>
                    </Pressable>
                  ))}
                </View>
              </View>

              <AppInput
                label={t('admin.value')}
                value={form.value}
                keyboardType="decimal-pad"
                error={formErrors.value}
                onChangeText={(value) => {
                  setForm((prev) => ({ ...prev, value }));
                  setFormErrors((prev) => ({ ...prev, value: undefined }));
                }}
              />

              <View style={[styles.halfRow, mirroredRow(isRTL), isCompact ? styles.halfRowCompact : null]}>
                <DateTimeField
                  label={t('admin.startDate')}
                  mode="date"
                  value={form.starts_at}
                  onChange={(value) => {
                    const next = new Date(form.starts_at);
                    next.setFullYear(value.getFullYear(), value.getMonth(), value.getDate());
                    setForm((prev) => ({ ...prev, starts_at: next }));
                    setFormErrors((prev) => ({ ...prev, dateRange: undefined }));
                  }}
                />
                <DateTimeField
                  label={t('admin.startTime')}
                  mode="time"
                  value={form.starts_at}
                  onChange={(value) => {
                    const next = new Date(form.starts_at);
                    next.setHours(value.getHours(), value.getMinutes(), 0, 0);
                    setForm((prev) => ({ ...prev, starts_at: next }));
                    setFormErrors((prev) => ({ ...prev, dateRange: undefined }));
                  }}
                />
              </View>

              <View style={[styles.halfRow, mirroredRow(isRTL), isCompact ? styles.halfRowCompact : null]}>
                <DateTimeField
                  label={t('admin.endDate')}
                  mode="date"
                  value={form.ends_at}
                  onChange={(value) => {
                    const next = new Date(form.ends_at);
                    next.setFullYear(value.getFullYear(), value.getMonth(), value.getDate());
                    setForm((prev) => ({ ...prev, ends_at: next }));
                    setFormErrors((prev) => ({ ...prev, dateRange: undefined }));
                  }}
                />
                <DateTimeField
                  label={t('admin.endTime')}
                  mode="time"
                  value={form.ends_at}
                  onChange={(value) => {
                    const next = new Date(form.ends_at);
                    next.setHours(value.getHours(), value.getMinutes(), 0, 0);
                    setForm((prev) => ({ ...prev, ends_at: next }));
                    setFormErrors((prev) => ({ ...prev, dateRange: undefined }));
                  }}
                />
              </View>
              {formErrors.dateRange ? (
                <AppText variant="caption" color={theme.colors.error}>{formErrors.dateRange}</AppText>
              ) : null}
              <AppText variant="caption" color={theme.colors.textSecondary}>
                {`${t('admin.timeRange')}: ${timezone}`}
              </AppText>

              <View>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>{t('admin.status')}</AppText>
                <View style={[styles.segmentRow, mirroredRow(isRTL)]}>
                  <Pressable
                    style={[styles.segmentChip, form.is_active ? styles.segmentChipActive : null]}
                    onPress={() => setForm((prev) => ({ ...prev, is_active: true }))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: form.is_active }}
                    accessibilityLabel={t('admin.active')}>
                    <AppText variant="caption">{t('admin.active')}</AppText>
                  </Pressable>
                  <Pressable
                    style={[styles.segmentChip, !form.is_active ? styles.segmentChipActive : null]}
                    onPress={() => setForm((prev) => ({ ...prev, is_active: false }))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: !form.is_active }}
                    accessibilityLabel={t('admin.inactive')}>
                    <AppText variant="caption">{t('admin.inactive')}</AppText>
                  </Pressable>
                </View>
              </View>

              <ActionRow compact={isCompact}>
                <AppButton
                  title={editingPromotionId ? t('admin.saveChanges') : t('admin.createPromotion')}
                  loading={saving}
                  disabled={!canSave}
                  onPress={() => void save()}
                  style={styles.flexButton}
                />
                {editingPromotionId ? <AppButton title={t('common.cancel')} variant="ghost" onPress={resetForm} fullWidth={false} /> : null}
              </ActionRow>
            </View>
          </AdminPageSection>
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <LoadingState label={t('common.loading')} />
        ) : error ? (
          <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={load} />
        ) : (
          <EmptyState title={t('admin.noPromotionsTitle')} subtitle={t('admin.noPromotionsSubtitle')} />
        )
      }
      refreshing={loading}
      onRefresh={load}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + theme.spacing.md,
          paddingBottom: insets.bottom + theme.spacing.xl,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  content: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
  },
  headerBlock: {
    marginBottom: theme.spacing.md,
    gap: theme.spacing.lg,
  },
  formStack: {
    gap: theme.spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  flexButton: {
    flex: 1,
  },
  grow: {
    flex: 1,
  },
  segmentRow: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  segmentChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  segmentChipActive: {
    borderColor: theme.colors.primary300,
    backgroundColor: theme.colors.secondaryCream,
  },
  halfRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  halfRowCompact: {
    flexDirection: 'column',
    gap: 0,
  },
  separator: {
    height: theme.spacing.md,
  },
});
