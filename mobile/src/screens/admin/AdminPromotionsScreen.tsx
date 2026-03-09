import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

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
  const isCompact = width < 390;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);
  const [form, setForm] = useState<PromotionForm>(defaultForm);

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
  };

  const save = async () => {
    if (!form.title_en.trim() || !form.title_ar.trim() || !form.value) {
      Alert.alert(t('common.error'), t('validation.requiredFields'));
      return;
    }

    if (form.ends_at.getTime() <= form.starts_at.getTime()) {
      Alert.alert(t('common.error'), t('admin.invalidDateRange'));
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
      await adminService.togglePromotion(promotion.id);
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    }
  };

  const sortedPromotions = useMemo(() => [...promotions].sort((a, b) => b.starts_at.localeCompare(a.starts_at)), [promotions]);
  const hasMissingTranslation = !form.title_en.trim() || !form.title_ar.trim();

  if (loading) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (error) {
    return <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={load} />;
  }

  return (
    <AppShell refreshing={loading} onRefresh={load}>
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
                  onPress={() => setForm((prev) => ({ ...prev, type: option }))}>
                  <AppText variant="caption">{promotionTypeLabel(option, t)}</AppText>
                </Pressable>
              ))}
            </View>
          </View>

          <AppInput label={t('admin.value')} value={form.value} keyboardType="decimal-pad" onChangeText={(value) => setForm((prev) => ({ ...prev, value }))} />

          <View style={[styles.halfRow, mirroredRow(isRTL), isCompact ? styles.halfRowCompact : null]}>
            <DateTimeField
              label={t('admin.startDate')}
              mode="date"
              value={form.starts_at}
              onChange={(value) => {
                const next = new Date(form.starts_at);
                next.setFullYear(value.getFullYear(), value.getMonth(), value.getDate());
                setForm((prev) => ({ ...prev, starts_at: next }));
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
              }}
            />
          </View>

          <View>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>{t('admin.status')}</AppText>
            <View style={[styles.segmentRow, mirroredRow(isRTL)]}>
              <Pressable style={[styles.segmentChip, form.is_active ? styles.segmentChipActive : null]} onPress={() => setForm((prev) => ({ ...prev, is_active: true }))}>
                <AppText variant="caption">{t('admin.active')}</AppText>
              </Pressable>
              <Pressable style={[styles.segmentChip, !form.is_active ? styles.segmentChipActive : null]} onPress={() => setForm((prev) => ({ ...prev, is_active: false }))}>
                <AppText variant="caption">{t('admin.inactive')}</AppText>
              </Pressable>
            </View>
          </View>

          <ActionRow compact={isCompact}>
            <AppButton
              title={editingPromotionId ? t('admin.saveChanges') : t('admin.createPromotion')}
              loading={saving}
              disabled={hasMissingTranslation}
              onPress={() => void save()}
              style={styles.flexButton}
            />
            {editingPromotionId ? <AppButton title={t('common.cancel')} variant="ghost" onPress={resetForm} fullWidth={false} /> : null}
          </ActionRow>
        </View>
      </AdminPageSection>

      {sortedPromotions.length === 0 ? (
        <EmptyState title={t('admin.noPromotionsTitle')} subtitle={t('admin.noPromotionsSubtitle')} />
      ) : (
        sortedPromotions.map((promotion) => (
          <AppCard key={promotion.id}>
            <View style={[styles.itemHeader, mirroredRow(isRTL)]}>
              <Pressable onPress={() => Alert.alert('', getLocalizedValue(promotion, language, 'title'))} style={styles.grow}>
                <ExpandableText value={getLocalizedValue(promotion, language, 'title')} variant="h3" numberOfLines={2} />
              </Pressable>
              <BadgeChip label={promotion.is_active ? t('admin.active') : t('admin.inactive')} tone={promotion.is_active ? 'success' : 'default'} />
            </View>
            <InfoLine
              label={t('admin.dateRange')}
              value={`${new Date(promotion.starts_at).toLocaleString(language === 'ar' ? 'ar-JO' : 'en-US')} - ${new Date(promotion.ends_at).toLocaleString(language === 'ar' ? 'ar-JO' : 'en-US')}`}
              numberOfLines={2}
            />
            <InfoLine label={t('admin.promotionType')} value={promotionTypeLabel(promotion.type, t)} />
            <InfoLine label={t('admin.value')} value={String(promotion.value)} />
            <ActionRow compact={isCompact}>
              <AppButton title={t('admin.edit')} variant="secondary" onPress={() => startEdit(promotion)} style={styles.flexButton} />
              <AppButton title={promotion.is_active ? t('admin.disable') : t('admin.enable')} variant="ghost" onPress={() => void togglePromotion(promotion)} fullWidth={false} />
            </ActionRow>
          </AppCard>
        ))
      )}
    </AppShell>
  );
};

const styles = StyleSheet.create({
  formStack: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
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
});
