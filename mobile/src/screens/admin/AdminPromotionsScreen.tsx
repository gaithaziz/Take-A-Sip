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
import { MenuEntityType, Promotion, PromotionTargetInput, Section } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { formatDateTimeWithZone, getCurrentTimeZone } from '@/utils/format';
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
  required_completed_orders: string;
  buy_quantity: string;
  free_quantity: string;
  targets: PromotionTargetInput[];
};

type TargetOption = {
  entity_type: MenuEntityType;
  entity_id: string;
  label: string;
  label_en: string;
  label_ar: string;
};

type TargetKeyShape = Pick<PromotionTargetInput, 'entity_type' | 'entity_id'>;

const defaultForm: PromotionForm = {
  title_en: '',
  title_ar: '',
  type: 'TEMPORARY',
  value: '',
  starts_at: new Date(),
  ends_at: new Date(Date.now() + 60 * 60 * 1000),
  is_active: true,
  required_completed_orders: '',
  buy_quantity: '',
  free_quantity: '',
  targets: [],
};

const typeOptions = ['TEMPORARY', 'FIRST_TIME', 'LOYALTY', 'BUY_N_GET_M_FREE'];

const targetKey = (target: TargetKeyShape | TargetOption) => `${target.entity_type}:${target.entity_id}`;

const promotionTypeLabel = (type: string, t: (key: string) => string) => {
  if (type === 'TEMPORARY') return t('admin.promoTypeTemporary');
  if (type === 'FIRST_TIME') return t('admin.promoTypeFirstTime');
  if (type === 'LOYALTY') return t('admin.promoTypeLoyalty');
  if (type === 'BUY_N_GET_M_FREE') return t('admin.promoTypeBuyGet');
  return type;
};

const buildOfferSummary = (parts: Array<string | null | undefined>) => parts.filter(Boolean).join(' | ');

const buildTargetOptions = (sections: Section[], language: 'en' | 'ar'): TargetOption[] => {
  const options: TargetOption[] = [];
  sections.forEach((section) => {
    const sectionLabel = getLocalizedValue(section, language, 'name');
    options.push({ entity_type: 'section', entity_id: section.id, label: sectionLabel, label_en: section.name_en, label_ar: section.name_ar });
    section.items.forEach((item) => {
      const itemLabel = `${sectionLabel} > ${getLocalizedValue(item, language, 'name')}`;
      options.push({ entity_type: 'item', entity_id: item.id, label: itemLabel, label_en: `${section.name_en} > ${item.name_en}`, label_ar: `${section.name_ar} > ${item.name_ar}` });
      item.item_types.forEach((itemType) => {
        const typeLabel = `${itemLabel} > ${getLocalizedValue(itemType, language, 'name')}`;
        options.push({ entity_type: 'type', entity_id: itemType.id, label: typeLabel, label_en: `${section.name_en} > ${item.name_en} > ${itemType.name_en}`, label_ar: `${section.name_ar} > ${item.name_ar} > ${itemType.name_ar}` });
        itemType.sizes.forEach((size) => {
          const sizeLabel = `${typeLabel} > ${getLocalizedValue(size, language, 'name')}`;
          options.push({ entity_type: 'size', entity_id: size.id, label: sizeLabel, label_en: `${section.name_en} > ${item.name_en} > ${itemType.name_en} > ${size.name_en}`, label_ar: `${section.name_ar} > ${item.name_ar} > ${itemType.name_ar} > ${size.name_ar}` });
          size.addons.forEach((addon) => {
            options.push({ entity_type: 'addon', entity_id: addon.id, label: `${sizeLabel} > ${getLocalizedValue(addon, language, 'name')}`, label_en: `${section.name_en} > ${item.name_en} > ${itemType.name_en} > ${size.name_en} > ${addon.name_en}`, label_ar: `${section.name_ar} > ${item.name_ar} > ${itemType.name_ar} > ${size.name_ar} > ${addon.name_ar}` });
          });
        });
      });
    });
  });
  return options;
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
  const [menuSections, setMenuSections] = useState<Section[]>([]);
  const [editingPromotionId, setEditingPromotionId] = useState<string | null>(null);
  const [form, setForm] = useState<PromotionForm>(defaultForm);
  const [formErrors, setFormErrors] = useState<Record<string, string | undefined>>({});
  const [mutatingPromotionId, setMutatingPromotionId] = useState<string | null>(null);
  const [targetQuery, setTargetQuery] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [promotionResponse, menuResponse] = await Promise.all([adminService.listPromotions(), adminService.getMenuTree()]);
      setPromotions(promotionResponse.promotions);
      setMenuSections(menuResponse.sections);
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const targetOptions = useMemo(() => buildTargetOptions(menuSections, language), [language, menuSections]);
  const sectionTargetOptions = useMemo(() => targetOptions.filter((option) => option.entity_type === 'section'), [targetOptions]);
  const targetOptionMap = useMemo(() => new Map(targetOptions.map((option) => [targetKey(option), option])), [targetOptions]);
  const selectedTargetKeys = useMemo(() => new Set(form.targets.map((target) => targetKey(target))), [form.targets]);
  const selectedTargetLabels = useMemo(
    () => form.targets.map((target) => targetOptionMap.get(targetKey(target))).filter(Boolean) as TargetOption[],
    [form.targets, targetOptionMap],
  );
  const allSectionsSelected = useMemo(
    () => sectionTargetOptions.length > 0 && sectionTargetOptions.every((option) => selectedTargetKeys.has(targetKey(option))),
    [sectionTargetOptions, selectedTargetKeys],
  );
  const filteredTargetOptions = useMemo(() => {
    const query = targetQuery.trim().toLowerCase();
    return targetOptions
      .filter((option) => !selectedTargetKeys.has(targetKey(option)))
      .filter((option) => !query || option.label.toLowerCase().includes(query) || option.label_en.toLowerCase().includes(query) || option.label_ar.toLowerCase().includes(query))
      .slice(0, 16);
  }, [selectedTargetKeys, targetOptions, targetQuery]);

  const resetForm = () => {
    setEditingPromotionId(null);
    setForm(defaultForm);
    setFormErrors({});
    setTargetQuery('');
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
      required_completed_orders: promotion.required_completed_orders == null ? '' : String(promotion.required_completed_orders),
      buy_quantity: promotion.buy_quantity == null ? '' : String(promotion.buy_quantity),
      free_quantity: promotion.free_quantity == null ? '' : String(promotion.free_quantity),
      targets: promotion.targets.map((target) => ({ entity_type: target.entity_type, entity_id: target.entity_id })),
    });
    setFormErrors({});
    setTargetQuery('');
  };

  const toggleTarget = (option: TargetOption) => {
    setForm((prev) => {
      const key = targetKey(option);
      const exists = prev.targets.some((target) => targetKey(target) === key);
      return {
        ...prev,
        targets: exists ? prev.targets.filter((target) => targetKey(target) !== key) : [...prev.targets, { entity_type: option.entity_type, entity_id: option.entity_id }],
      };
    });
  };

  const applyWholeMenu = () => {
    setForm((prev) => ({ ...prev, targets: [] }));
  };

  const applyAllSections = () => {
    setForm((prev) => ({
      ...prev,
      targets: sectionTargetOptions.map((option) => ({ entity_type: option.entity_type, entity_id: option.entity_id })),
    }));
  };

  const toggleSectionTarget = (option: TargetOption) => {
    toggleTarget(option);
  };

  const validateForm = () => {
    const nextErrors: Record<string, string | undefined> = {};
    if (form.type !== 'BUY_N_GET_M_FREE' && (!form.value || Number.isNaN(Number(form.value)))) nextErrors.value = t('validation.requiredFields');
    if (form.ends_at.getTime() <= form.starts_at.getTime()) nextErrors.dateRange = t('admin.invalidDateRange');
    if (form.type === 'LOYALTY' && (!form.required_completed_orders || Number.isNaN(Number(form.required_completed_orders)))) nextErrors.required_completed_orders = t('validation.requiredFields');
    if (form.required_completed_orders && Number.isNaN(Number(form.required_completed_orders))) nextErrors.required_completed_orders = t('validation.requiredFields');
    if (form.type === 'BUY_N_GET_M_FREE') {
      if (!form.buy_quantity || Number(form.buy_quantity) <= 0 || Number.isNaN(Number(form.buy_quantity))) nextErrors.buy_quantity = t('validation.requiredFields');
      if (!form.free_quantity || Number(form.free_quantity) <= 0 || Number.isNaN(Number(form.free_quantity))) nextErrors.free_quantity = t('validation.requiredFields');
    }
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const save = async () => {
    if (!validateForm() || !form.title_en.trim() || !form.title_ar.trim()) return;
    try {
      setSaving(true);
      const payload = {
        title_en: form.title_en.trim(),
        title_ar: form.title_ar.trim(),
        type: form.type,
        value: form.type === 'BUY_N_GET_M_FREE' ? 0 : Number(form.value),
        starts_at: form.starts_at.toISOString(),
        ends_at: form.ends_at.toISOString(),
        is_active: form.is_active,
        required_completed_orders: form.type === 'FIRST_TIME' || !form.required_completed_orders ? null : Number(form.required_completed_orders),
        buy_quantity: form.type === 'BUY_N_GET_M_FREE' ? Number(form.buy_quantity) : null,
        free_quantity: form.type === 'BUY_N_GET_M_FREE' ? Number(form.free_quantity) : null,
        loyalty_rule_id: null,
        targets: form.targets,
      };
      if (editingPromotionId) await adminService.updatePromotion(editingPromotionId, payload);
      else await adminService.createPromotion(payload);
      resetForm();
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    } finally {
      setSaving(false);
    }
  };

  const togglePromotion = async (promotion: Promotion) => {
    const startsAt = new Date(promotion.starts_at).getTime();
    const endsAt = new Date(promotion.ends_at).getTime();
    const isLive = promotion.is_active && Date.now() >= startsAt && Date.now() <= endsAt;
    const run = async () => {
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
    if (isLive) {
      Alert.alert(promotion.is_active ? t('admin.disable') : t('admin.enable'), t('admin.liveOfferToggleConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), onPress: () => void run() },
      ]);
      return;
    }
    await run();
  };

  const hasMissingTranslation = !form.title_en.trim() || !form.title_ar.trim();
  const canSave = !hasMissingTranslation && !saving && form.ends_at.getTime() > form.starts_at.getTime() && (form.type === 'BUY_N_GET_M_FREE' ? Boolean(form.buy_quantity && form.free_quantity) : Boolean(form.value));
  const timezone = getCurrentTimeZone();
  const scopePreview =
    form.targets.length === 0
      ? t('admin.appliesToWholeMenu')
      : allSectionsSelected && form.targets.length === sectionTargetOptions.length
        ? t('admin.allSections')
        : selectedTargetLabels.length <= 2
          ? selectedTargetLabels.map((option) => option.label).join(', ')
          : `${selectedTargetLabels
              .slice(0, 2)
              .map((option) => option.label)
              .join(', ')} +${selectedTargetLabels.length - 2}`;
  const eligibilityPreview =
    form.type === 'FIRST_TIME'
      ? t('admin.firstTimeEligibilityDetail')
      : form.required_completed_orders
        ? `${t('admin.completedOrdersEligibilityPrefix')} ${form.required_completed_orders} ${t('admin.ordersThreshold')}`
        : form.type === 'BUY_N_GET_M_FREE'
          ? t('admin.buyGetEligibilityDetail')
          : form.type === 'LOYALTY'
            ? t('admin.loyaltyEligibilityDetail')
            : t('admin.temporaryEligibilityDetail');
  const formRulePreview =
    form.type === 'BUY_N_GET_M_FREE'
      ? `${t('admin.buyQuantity')} ${form.buy_quantity || 0}, ${t('admin.freeQuantity')} ${form.free_quantity || 0}`
      : form.value
        ? `${t('admin.value')} ${form.value}`
        : null;
  const offerSummaryPreview = buildOfferSummary([promotionTypeLabel(form.type, t), formRulePreview, eligibilityPreview, scopePreview]);

  if (loading) return <LoadingState label={t('common.loading')} />;
  if (error) return <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={load} />;

  return (
    <AppShell refreshing={loading} onRefresh={load}>
      <View style={styles.heading}>
        <AppText variant="h1">{t('admin.promotionsTitle')}</AppText>
      </View>

      <AdminPageSection title={editingPromotionId ? t('admin.editPromotion') : t('admin.createPromotion')}>
        <View style={styles.stack}>
          <AdminPageSection title={t('admin.offerIdentity')} style={styles.innerSection}>
            <BilingualFieldGroup
              labelEn={t('admin.titleEn')}
              labelAr={t('admin.titleAr')}
              valueEn={form.title_en}
              valueAr={form.title_ar}
              onChangeEn={(value) => setForm((prev) => ({ ...prev, title_en: value }))}
              onChangeAr={(value) => setForm((prev) => ({ ...prev, title_ar: value }))}
              helperText={hasMissingTranslation ? t('admin.missingTranslation') : undefined}
            />
          </AdminPageSection>

          <AdminPageSection title={t('admin.offerRules')} style={styles.innerSection}>
            <View style={[styles.rowWrap, mirroredRow(isRTL)]}>
              {typeOptions.map((option) => (
                <Pressable
                  key={option}
                  style={[styles.chip, form.type === option ? styles.chipActive : null]}
                  onPress={() => setForm((prev) => ({ ...prev, type: option, required_completed_orders: option === 'FIRST_TIME' ? '' : prev.required_completed_orders, buy_quantity: option === 'BUY_N_GET_M_FREE' ? prev.buy_quantity : '', free_quantity: option === 'BUY_N_GET_M_FREE' ? prev.free_quantity : '' }))}
                  accessibilityRole="button"
                  accessibilityState={{ selected: form.type === option }}
                  accessibilityLabel={`${t('admin.promotionType')}: ${promotionTypeLabel(option, t)}`}>
                  <AppText variant="caption">{promotionTypeLabel(option, t)}</AppText>
                </Pressable>
              ))}
            </View>
            {form.type === 'BUY_N_GET_M_FREE' ? (
              <View style={[styles.twoCol, mirroredRow(isRTL), isCompact ? styles.stackCol : null]}>
                <AppInput label={t('admin.buyQuantity')} value={form.buy_quantity} keyboardType="number-pad" error={formErrors.buy_quantity} onChangeText={(value) => setForm((prev) => ({ ...prev, buy_quantity: value }))} />
                <AppInput label={t('admin.freeQuantity')} value={form.free_quantity} keyboardType="number-pad" error={formErrors.free_quantity} onChangeText={(value) => setForm((prev) => ({ ...prev, free_quantity: value }))} />
              </View>
            ) : (
              <AppInput label={t('admin.value')} value={form.value} keyboardType="decimal-pad" error={formErrors.value} onChangeText={(value) => setForm((prev) => ({ ...prev, value }))} />
            )}
          </AdminPageSection>

          <AdminPageSection title={t('admin.offerWindow')} style={styles.innerSection}>
            <View style={[styles.twoCol, mirroredRow(isRTL), isCompact ? styles.stackCol : null]}>
              <DateTimeField
                label={t('admin.startDate')}
                mode="date"
                value={form.starts_at}
                onChange={(value) =>
                  setForm((prev) => {
                    const next = new Date(prev.starts_at);
                    next.setFullYear(value.getFullYear(), value.getMonth(), value.getDate());
                    return { ...prev, starts_at: next };
                  })
                }
              />
              <DateTimeField label={t('admin.startTime')} mode="time" value={form.starts_at} onChange={(value) => setForm((prev) => {
                const next = new Date(prev.starts_at);
                next.setHours(value.getHours(), value.getMinutes(), 0, 0);
                return { ...prev, starts_at: next };
              })} />
            </View>
            <View style={[styles.twoCol, mirroredRow(isRTL), isCompact ? styles.stackCol : null]}>
              <DateTimeField
                label={t('admin.endDate')}
                mode="date"
                value={form.ends_at}
                onChange={(value) =>
                  setForm((prev) => {
                    const next = new Date(prev.ends_at);
                    next.setFullYear(value.getFullYear(), value.getMonth(), value.getDate());
                    return { ...prev, ends_at: next };
                  })
                }
              />
              <DateTimeField label={t('admin.endTime')} mode="time" value={form.ends_at} onChange={(value) => setForm((prev) => {
                const next = new Date(prev.ends_at);
                next.setHours(value.getHours(), value.getMinutes(), 0, 0);
                return { ...prev, ends_at: next };
              })} />
            </View>
            {formErrors.dateRange ? <AppText variant="caption" color={theme.colors.error}>{formErrors.dateRange}</AppText> : null}
            <AppText variant="caption" color={theme.colors.textSecondary}>{`${t('admin.timeRange')}: ${timezone}`}</AppText>
          </AdminPageSection>

          <AdminPageSection title={t('admin.eligibleMenuItems')} style={styles.innerSection}>
            <View style={styles.quickPickGroup}>
              <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.quickTargetPicks')}</AppText>
              <View style={[styles.rowWrap, mirroredRow(isRTL)]}>
                <Pressable style={[styles.chip, form.targets.length === 0 ? styles.chipActive : null]} onPress={applyWholeMenu} accessibilityRole="button">
                  <AppText variant="caption">{t('admin.wholeMenu')}</AppText>
                </Pressable>
                <Pressable style={[styles.chip, allSectionsSelected ? styles.chipActive : null]} onPress={applyAllSections} accessibilityRole="button">
                  <AppText variant="caption">{t('admin.allSections')}</AppText>
                </Pressable>
                {sectionTargetOptions.map((option) => (
                  <Pressable key={targetKey(option)} style={[styles.chip, selectedTargetKeys.has(targetKey(option)) ? styles.chipActive : null]} onPress={() => toggleSectionTarget(option)} accessibilityRole="button" accessibilityLabel={option.label}>
                    <AppText variant="caption">{option.label}</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
            <AppInput label={t('admin.targetSearch')} value={targetQuery} onChangeText={setTargetQuery} placeholder={t('admin.targetSearchPlaceholder')} />
            <AppText variant="caption" color={theme.colors.textSecondary}>{scopePreview}</AppText>
            <View style={[styles.rowWrap, mirroredRow(isRTL)]}>
              {selectedTargetLabels.length === 0 ? <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.noTargetsSelected')}</AppText> : selectedTargetLabels.map((option) => (
                <Pressable key={targetKey(option)} style={styles.targetChip} onPress={() => toggleTarget(option)} accessibilityRole="button" accessibilityLabel={option.label}>
                  <AppText variant="caption" color={theme.colors.textSecondary}>{option.label}</AppText>
                </Pressable>
              ))}
            </View>
            <View style={[styles.rowWrap, mirroredRow(isRTL)]}>
              {filteredTargetOptions.map((option) => (
                <Pressable key={targetKey(option)} style={styles.chip} onPress={() => toggleTarget(option)} accessibilityRole="button" accessibilityLabel={option.label}>
                  <AppText variant="caption">{option.label}</AppText>
                </Pressable>
              ))}
            </View>
          </AdminPageSection>

          <AdminPageSection title={t('admin.eligibilityTrigger')} style={styles.innerSection}>
            {form.type !== 'FIRST_TIME' ? (
              <AppInput
                label={t('admin.requiredCompletedOrders')}
                value={form.required_completed_orders}
                keyboardType="number-pad"
                error={formErrors.required_completed_orders}
                onChangeText={(value) => setForm((prev) => ({ ...prev, required_completed_orders: value }))}
                placeholder={t('admin.optional')}
              />
            ) : null}
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>{eligibilityPreview}</AppText>
          </AdminPageSection>

          <AdminPageSection title={t('admin.offerStatusSection')} style={styles.innerSection}>
            <View style={[styles.rowWrap, mirroredRow(isRTL)]}>
              <Pressable style={[styles.chip, form.is_active ? styles.chipActive : null]} onPress={() => setForm((prev) => ({ ...prev, is_active: true }))}><AppText variant="caption">{t('admin.active')}</AppText></Pressable>
              <Pressable style={[styles.chip, !form.is_active ? styles.chipActive : null]} onPress={() => setForm((prev) => ({ ...prev, is_active: false }))}><AppText variant="caption">{t('admin.inactive')}</AppText></Pressable>
            </View>
            <InfoLine label={t('admin.offerSummary')} value={offerSummaryPreview} numberOfLines={3} />
            <InfoLine label={t('admin.scopeSummary')} value={scopePreview} numberOfLines={2} />
            <InfoLine label={t('admin.eligibilitySummary')} value={eligibilityPreview} numberOfLines={2} />
          </AdminPageSection>

          <ActionRow compact={isCompact}>
            <AppButton title={editingPromotionId ? t('admin.saveChanges') : t('admin.createPromotion')} loading={saving} disabled={!canSave} onPress={() => void save()} style={styles.flexButton} />
            {editingPromotionId ? <AppButton title={t('common.cancel')} variant="ghost" onPress={resetForm} fullWidth={false} /> : null}
          </ActionRow>
        </View>
      </AdminPageSection>

      {promotions.length === 0 ? <EmptyState title={t('admin.noPromotionsTitle')} subtitle={t('admin.noPromotionsSubtitle')} /> : (
        <View style={styles.stack}>
          {promotions.map((promotion) => {
            const now = Date.now();
            const startsAt = new Date(promotion.starts_at).getTime();
            const endsAt = new Date(promotion.ends_at).getTime();
            const scopeSummary = language === 'ar' ? promotion.scope_summary_ar : promotion.scope_summary_en;
            const eligibilitySummary = language === 'ar' ? promotion.eligibility_summary_ar : promotion.eligibility_summary_en;
            const ruleValue =
              promotion.type === 'BUY_N_GET_M_FREE'
                ? `${t('admin.buyQuantity')} ${promotion.buy_quantity ?? 0}, ${t('admin.freeQuantity')} ${promotion.free_quantity ?? 0}`
                : `${t('admin.value')} ${promotion.value}`;
            const cardSummary = buildOfferSummary([promotionTypeLabel(promotion.type, t), ruleValue, eligibilitySummary, scopeSummary]);
            return (
              <AppCard key={promotion.id} style={styles.card}>
                <View style={[styles.cardHeader, mirroredRow(isRTL)]}>
                  <View style={styles.flexButton}>
                    <ExpandableText value={getLocalizedValue(promotion, language, 'title')} variant="h3" numberOfLines={2} />
                  </View>
                  <View style={styles.badges}>
                    <BadgeChip label={promotion.is_active ? t('admin.active') : t('admin.inactive')} tone={promotion.is_active ? 'success' : 'default'} />
                    {promotion.is_active && now >= startsAt && now <= endsAt ? <BadgeChip label={t('admin.liveNow')} tone="warning" /> : null}
                  </View>
                </View>
                <View style={styles.infoBox}>
                  <InfoLine label={t('admin.offerSummary')} value={cardSummary} numberOfLines={3} />
                  <InfoLine label={`${t('admin.dateRange')} (${timezone})`} value={`${formatDateTimeWithZone(promotion.starts_at, language)} - ${formatDateTimeWithZone(promotion.ends_at, language)}`} numberOfLines={2} />
                  <InfoLine label={t('admin.promotionType')} value={promotionTypeLabel(promotion.type, t)} />
                  <InfoLine label={promotion.type === 'BUY_N_GET_M_FREE' ? t('admin.buyGetRule') : t('admin.value')} value={ruleValue} />
                  <InfoLine label={t('admin.scopeSummary')} value={scopeSummary} numberOfLines={2} />
                  <InfoLine label={t('admin.eligibilitySummary')} value={eligibilitySummary} numberOfLines={2} />
                </View>
                <ActionRow compact={isCompact}>
                  <AppButton title={t('admin.edit')} variant="secondary" onPress={() => startEdit(promotion)} style={styles.flexButton} disabled={mutatingPromotionId === promotion.id} />
                  <AppButton title={promotion.is_active ? t('admin.disable') : t('admin.enable')} variant="ghost" fullWidth={false} loading={mutatingPromotionId === promotion.id} disabled={Boolean(mutatingPromotionId && mutatingPromotionId !== promotion.id)} onPress={() => void togglePromotion(promotion)} />
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
  heading: { gap: theme.spacing.xs },
  stack: { gap: theme.spacing.lg },
  innerSection: { padding: theme.spacing.md, backgroundColor: theme.colors.sectionBackground },
  quickPickGroup: { gap: theme.spacing.sm },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  twoCol: { flexDirection: 'row', gap: theme.spacing.sm },
  stackCol: { flexDirection: 'column' },
  chip: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface },
  chipActive: { borderColor: theme.colors.primary300, backgroundColor: theme.colors.secondaryCream },
  targetChip: { borderWidth: 1, borderColor: theme.colors.primary200, borderRadius: theme.radius.pill, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.secondaryCream },
  flexButton: { flex: 1 },
  card: { gap: theme.spacing.sm, backgroundColor: theme.colors.secondaryCream, borderColor: theme.colors.primary200 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing.sm },
  badges: { gap: theme.spacing.xs, alignItems: 'flex-end' },
  infoBox: { gap: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, padding: theme.spacing.sm },
});
