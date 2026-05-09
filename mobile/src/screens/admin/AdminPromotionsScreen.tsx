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
import { ActionRow } from '@/components/admin/ActionRow';
import { AdminPageSection } from '@/components/admin/AdminPageSection';
import { BilingualFieldGroup } from '@/components/admin/BilingualFieldGroup';
import { ExpandableText } from '@/components/admin/ExpandableText';
import { InfoLine } from '@/components/admin/InfoLine';
import { SelectDropdownField } from '@/components/admin/SelectDropdownField';
import { DetailPageSkeleton } from '@/components/skeleton/PageSkeletons';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { adminService } from '@/services/adminService';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { MenuEntityType, Promotion, PromotionTargetInput, Section } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { formatDateTimeWithZone, getCurrentTimeZone } from '@/utils/format';
import { getLocalizedValue } from '@/utils/i18n';
import { mirroredRow } from '@/utils/layout';

type OfferBehavior = 'FIXED_DISCOUNT' | 'BUY_N_GET_M_FREE' | 'FREE_DELIVERY_ABOVE_AMOUNT';
type EligibilityMode = 'EVERYONE' | 'NEW_CUSTOMERS' | 'AFTER_ORDER_COUNT';
type TargetSelectionMode = 'WHOLE_MENU' | 'SPECIFIC_TARGETS';
type TargetListKey = 'scope_targets' | 'buy_targets' | 'free_targets';

type PromotionForm = {
  title_en: string;
  title_ar: string;
  behavior: OfferBehavior;
  eligibility_mode: EligibilityMode;
  value: string;
  starts_at: Date;
  ends_at: Date;
  is_active: boolean;
  required_completed_orders: string;
  buy_quantity: string;
  free_quantity: string;
  scope_targets: PromotionTargetInput[];
  buy_targets: PromotionTargetInput[];
  free_targets: PromotionTargetInput[];
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
  behavior: 'FIXED_DISCOUNT',
  eligibility_mode: 'EVERYONE',
  value: '',
  starts_at: new Date(),
  ends_at: new Date(Date.now() + 60 * 60 * 1000),
  is_active: true,
  required_completed_orders: '',
  buy_quantity: '',
  free_quantity: '',
  scope_targets: [],
  buy_targets: [],
  free_targets: [],
};

const targetTypeOptions: MenuEntityType[] = ['item', 'section', 'type', 'size', 'addon'];
const targetKey = (target: TargetKeyShape | TargetOption) => `${target.entity_type}:${target.entity_id}`;

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

const inferBehavior = (promotion: Promotion): OfferBehavior => {
  if (promotion.type === 'BUY_N_GET_M_FREE') return 'BUY_N_GET_M_FREE';
  if (promotion.type === 'FREE_DELIVERY_ABOVE_AMOUNT') return 'FREE_DELIVERY_ABOVE_AMOUNT';
  return 'FIXED_DISCOUNT';
};

const inferEligibilityMode = (promotion: Promotion): EligibilityMode => {
  if (promotion.type === 'FIRST_TIME') return 'NEW_CUSTOMERS';
  if (promotion.required_completed_orders != null || promotion.type === 'LOYALTY') return 'AFTER_ORDER_COUNT';
  return 'EVERYONE';
};

const serializeTargets = (targets: Array<{ entity_type: MenuEntityType; entity_id: string }>) =>
  targets.map((target) => ({ entity_type: target.entity_type, entity_id: target.entity_id }));

const derivePromotionType = (form: PromotionForm): Promotion['type'] => {
  if (form.behavior === 'BUY_N_GET_M_FREE') return 'BUY_N_GET_M_FREE';
  if (form.behavior === 'FREE_DELIVERY_ABOVE_AMOUNT') return 'FREE_DELIVERY_ABOVE_AMOUNT';
  if (form.eligibility_mode === 'NEW_CUSTOMERS') return 'FIRST_TIME';
  if (form.eligibility_mode === 'AFTER_ORDER_COUNT') return 'LOYALTY';
  return 'TEMPORARY';
};

const behaviorLabel = (behavior: OfferBehavior, t: (key: string) => string) =>
  behavior === 'BUY_N_GET_M_FREE'
    ? t('admin.offerBehaviorBuyGet')
    : behavior === 'FREE_DELIVERY_ABOVE_AMOUNT'
      ? t('admin.offerBehaviorFreeDelivery')
      : t('admin.offerBehaviorDiscount');

const targetSummary = (
  targets: PromotionTargetInput[],
  targetOptionMap: Map<string, TargetOption>,
  t: (key: string) => string,
) => {
  if (targets.length === 0) return t('admin.appliesToWholeMenu');
  const labels = targets.map((target) => targetOptionMap.get(targetKey(target))).filter(Boolean) as TargetOption[];
  if (labels.length <= 2) return labels.map((option) => option.label).join(', ');
  return `${labels
    .slice(0, 2)
    .map((option) => option.label)
    .join(', ')} +${labels.length - 2}`;
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
  const [targetQueries, setTargetQueries] = useState<Record<TargetListKey, string>>({
    scope_targets: '',
    buy_targets: '',
    free_targets: '',
  });
  const [targetTypeFilters, setTargetTypeFilters] = useState<Record<TargetListKey, MenuEntityType>>({
    scope_targets: 'item',
    buy_targets: 'item',
    free_targets: 'item',
  });
  const [targetModes, setTargetModes] = useState<Record<TargetListKey, TargetSelectionMode>>({
    scope_targets: 'WHOLE_MENU',
    buy_targets: 'WHOLE_MENU',
    free_targets: 'WHOLE_MENU',
  });

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
  const targetOptionMap = useMemo(() => new Map(targetOptions.map((option) => [targetKey(option), option])), [targetOptions]);
  const timezone = getCurrentTimeZone();

  const resetTargetPickerState = () => {
    setTargetQueries({ scope_targets: '', buy_targets: '', free_targets: '' });
    setTargetTypeFilters({ scope_targets: 'item', buy_targets: 'item', free_targets: 'item' });
    setTargetModes({ scope_targets: 'WHOLE_MENU', buy_targets: 'WHOLE_MENU', free_targets: 'WHOLE_MENU' });
  };

  const resetForm = () => {
    setEditingPromotionId(null);
    setForm(defaultForm);
    setFormErrors({});
    resetTargetPickerState();
  };

  const startEdit = (promotion: Promotion) => {
    const nextBehavior = inferBehavior(promotion);
    const nextScopeTargets = serializeTargets(promotion.targets);
    const nextBuyTargets =
      promotion.buy_targets.length > 0
        ? serializeTargets(promotion.buy_targets)
        : nextBehavior === 'BUY_N_GET_M_FREE'
          ? nextScopeTargets
          : [];
    const nextFreeTargets =
      promotion.free_targets.length > 0
        ? serializeTargets(promotion.free_targets)
        : nextBehavior === 'BUY_N_GET_M_FREE'
          ? nextScopeTargets
          : [];

    setEditingPromotionId(promotion.id);
    setForm({
      title_en: promotion.title_en,
      title_ar: promotion.title_ar,
      behavior: nextBehavior,
      eligibility_mode: inferEligibilityMode(promotion),
      value: String(promotion.value),
      starts_at: new Date(promotion.starts_at),
      ends_at: new Date(promotion.ends_at),
      is_active: promotion.is_active,
      required_completed_orders: promotion.required_completed_orders == null ? '' : String(promotion.required_completed_orders),
      buy_quantity: promotion.buy_quantity == null ? '' : String(promotion.buy_quantity),
      free_quantity: promotion.free_quantity == null ? '' : String(promotion.free_quantity),
      scope_targets: nextScopeTargets,
      buy_targets: nextBuyTargets,
      free_targets: nextFreeTargets,
    });
    setFormErrors({});
    resetTargetPickerState();
    setTargetModes({
      scope_targets: nextScopeTargets.length > 0 ? 'SPECIFIC_TARGETS' : 'WHOLE_MENU',
      buy_targets: nextBuyTargets.length > 0 ? 'SPECIFIC_TARGETS' : 'WHOLE_MENU',
      free_targets: nextFreeTargets.length > 0 ? 'SPECIFIC_TARGETS' : 'WHOLE_MENU',
    });
  };

  const updateTargetList = (key: TargetListKey, updater: (targets: PromotionTargetInput[]) => PromotionTargetInput[]) => {
    setForm((prev) => ({ ...prev, [key]: updater(prev[key]) }));
  };

  const addTarget = (key: TargetListKey, option: TargetOption) => {
    setTargetModes((prev) => ({ ...prev, [key]: 'SPECIFIC_TARGETS' }));
    updateTargetList(key, (targets) => {
      if (targets.some((target) => targetKey(target) === targetKey(option))) return targets;
      return [...targets, { entity_type: option.entity_type, entity_id: option.entity_id }];
    });
  };

  const removeTarget = (key: TargetListKey, option: TargetOption) => {
    updateTargetList(key, (targets) => targets.filter((target) => targetKey(target) !== targetKey(option)));
  };

  const setTargetMode = (key: TargetListKey, mode: TargetSelectionMode) => {
    setTargetModes((prev) => ({ ...prev, [key]: mode }));
    setTargetQueries((prev) => ({ ...prev, [key]: '' }));
    if (mode === 'WHOLE_MENU') {
      updateTargetList(key, () => []);
    }
  };

  const validateForm = () => {
    const nextErrors: Record<string, string | undefined> = {};
    if (!form.title_en.trim() || !form.title_ar.trim()) nextErrors.translation = t('admin.missingTranslation');
    if (form.behavior !== 'BUY_N_GET_M_FREE' && (!form.value || Number.isNaN(Number(form.value)) || Number(form.value) <= 0)) nextErrors.value = t('validation.requiredFields');
    if (form.behavior === 'BUY_N_GET_M_FREE') {
      if (!form.buy_quantity || Number(form.buy_quantity) <= 0 || Number.isNaN(Number(form.buy_quantity))) nextErrors.buy_quantity = t('validation.requiredFields');
      if (!form.free_quantity || Number(form.free_quantity) <= 0 || Number.isNaN(Number(form.free_quantity))) nextErrors.free_quantity = t('validation.requiredFields');
    }
    if (form.eligibility_mode === 'AFTER_ORDER_COUNT' && (!form.required_completed_orders || Number.isNaN(Number(form.required_completed_orders)))) {
      nextErrors.required_completed_orders = t('validation.requiredFields');
    }
    if (form.ends_at.getTime() <= form.starts_at.getTime()) nextErrors.dateRange = t('admin.invalidDateRange');
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const save = async () => {
    if (!validateForm()) return;
    try {
      setSaving(true);
      const payload = {
        title_en: form.title_en.trim(),
        title_ar: form.title_ar.trim(),
        type: derivePromotionType(form),
        value: form.behavior === 'BUY_N_GET_M_FREE' ? 0 : Number(form.value),
        starts_at: form.starts_at.toISOString(),
        ends_at: form.ends_at.toISOString(),
        is_active: form.is_active,
        required_completed_orders: form.eligibility_mode === 'AFTER_ORDER_COUNT' ? Number(form.required_completed_orders) : null,
        buy_quantity: form.behavior === 'BUY_N_GET_M_FREE' ? Number(form.buy_quantity) : null,
        free_quantity: form.behavior === 'BUY_N_GET_M_FREE' ? Number(form.free_quantity) : null,
        loyalty_rule_id: null,
        targets: form.behavior === 'FIXED_DISCOUNT' ? form.scope_targets : [],
        buy_targets: form.behavior === 'BUY_N_GET_M_FREE' ? form.buy_targets : [],
        free_targets: form.behavior === 'BUY_N_GET_M_FREE' ? form.free_targets : [],
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

  const canSave =
    !saving &&
    form.title_en.trim().length > 0 &&
    form.title_ar.trim().length > 0 &&
    form.ends_at.getTime() > form.starts_at.getTime() &&
    (form.behavior === 'BUY_N_GET_M_FREE' ? Boolean(form.buy_quantity && form.free_quantity) : Boolean(form.value)) &&
    (form.eligibility_mode !== 'AFTER_ORDER_COUNT' || Boolean(form.required_completed_orders));

  const scopeMode = targetModes.scope_targets;
  const buyMode = targetModes.buy_targets;
  const freeMode = targetModes.free_targets;

  const selectedTargetsFor = (key: TargetListKey) =>
    form[key].map((target) => targetOptionMap.get(targetKey(target))).filter(Boolean) as TargetOption[];

  const filteredTargetOptionsFor = (key: TargetListKey) => {
    const selectedKeys = new Set(form[key].map((target) => targetKey(target)));
    const query = targetQueries[key].trim().toLowerCase();
    return targetOptions
      .filter((option) => option.entity_type === targetTypeFilters[key])
      .filter((option) => !selectedKeys.has(targetKey(option)))
      .filter((option) => !query || option.label.toLowerCase().includes(query) || option.label_en.toLowerCase().includes(query) || option.label_ar.toLowerCase().includes(query))
      .slice(0, 12);
  };

  const eligibilityPreview =
    form.eligibility_mode === 'NEW_CUSTOMERS'
      ? t('admin.eligibilityFirstTimeHelp')
      : form.eligibility_mode === 'AFTER_ORDER_COUNT'
        ? `${t('admin.completedOrdersEligibilityPrefix')} ${form.required_completed_orders || 0} ${t('admin.ordersThreshold')}`
        : t('admin.eligibilityEveryoneHelp');

  const rulePreview =
    form.behavior === 'BUY_N_GET_M_FREE'
      ? `${t('admin.buyQuantity')} ${form.buy_quantity || 0}, ${t('admin.freeQuantity')} ${form.free_quantity || 0}`
      : form.behavior === 'FREE_DELIVERY_ABOVE_AMOUNT'
        ? `${t('admin.minimumOrderAmount')} ${form.value || 0}`
        : `${t('admin.discountAmount')} ${form.value || 0}`;

  const scopePreview = targetSummary(form.scope_targets, targetOptionMap, t);
  const buyPreview = targetSummary(form.buy_targets, targetOptionMap, t);
  const freePreview = targetSummary(form.free_targets, targetOptionMap, t);
  const offerSummaryPreview = buildOfferSummary([
    behaviorLabel(form.behavior, t),
    rulePreview,
    eligibilityPreview,
    form.behavior === 'BUY_N_GET_M_FREE' ? `${t('admin.buyFrom')}: ${buyPreview}` : form.behavior === 'FIXED_DISCOUNT' ? scopePreview : null,
    form.behavior === 'BUY_N_GET_M_FREE' ? `${t('admin.freeFrom')}: ${freePreview}` : null,
  ]);

  const behaviorCards = [
    { value: 'FIXED_DISCOUNT' as const, title: t('admin.offerBehaviorDiscount'), description: t('admin.offerBehaviorDiscountHelp') },
    { value: 'BUY_N_GET_M_FREE' as const, title: t('admin.offerBehaviorBuyGet'), description: t('admin.offerBehaviorBuyGetHelp') },
    { value: 'FREE_DELIVERY_ABOVE_AMOUNT' as const, title: t('admin.offerBehaviorFreeDelivery'), description: t('admin.offerBehaviorFreeDeliveryHelp') },
  ];

  const eligibilityCards =
    form.behavior !== 'FIXED_DISCOUNT'
      ? [
          { value: 'EVERYONE' as const, title: t('admin.eligibilityEveryone'), description: t('admin.eligibilityEveryoneHelp') },
          { value: 'AFTER_ORDER_COUNT' as const, title: t('admin.eligibilityAfterOrders'), description: t('admin.eligibilityAfterOrdersHelp') },
        ]
      : [
          { value: 'EVERYONE' as const, title: t('admin.eligibilityEveryone'), description: t('admin.eligibilityEveryoneHelp') },
          { value: 'NEW_CUSTOMERS' as const, title: t('admin.eligibilityFirstTime'), description: t('admin.eligibilityFirstTimeHelp') },
          { value: 'AFTER_ORDER_COUNT' as const, title: t('admin.eligibilityAfterOrders'), description: t('admin.eligibilityAfterOrdersHelp') },
        ];

  const targetTypeSelectOptions = targetTypeOptions.map((option) => ({ value: option, label: t(`admin.${option}`) }));

  const renderSelectorCards = <T extends string>({
    accessibilityPrefix,
    options,
    selectedValue,
    onSelect,
  }: {
    accessibilityPrefix: string;
    options: Array<{ value: T; title: string; description: string }>;
    selectedValue: T;
    onSelect: (value: T) => void;
  }) => (
    <View style={styles.selectorStack}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          style={({ pressed }) => [pressed ? styles.pressed : null]}
          onPress={() => onSelect(option.value)}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedValue === option.value }}
          accessibilityLabel={`${accessibilityPrefix}: ${option.title}`}>
          <AppCard style={[styles.selectorCard, selectedValue === option.value ? styles.selectorCardActive : null]}>
            <AppText variant="h3">{option.title}</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {option.description}
            </AppText>
          </AppCard>
        </Pressable>
      ))}
    </View>
  );

  const renderTargetPicker = ({
    listKey,
    title,
    description,
    mode,
  }: {
    listKey: TargetListKey;
    title: string;
    description: string;
    mode: TargetSelectionMode;
  }) => {
    const selectedLabels = selectedTargetsFor(listKey);
    const filteredOptions = filteredTargetOptionsFor(listKey);
    return (
      <AdminPageSection title={title} style={styles.innerSection}>
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          {description}
        </AppText>
        <View style={styles.selectorStack}>
          {[
            { value: 'WHOLE_MENU' as const, title: t('admin.wholeMenu'), description: t('admin.scopeWholeMenuHelp') },
            { value: 'SPECIFIC_TARGETS' as const, title: t('admin.specificTargets'), description: t('admin.scopeSpecificTargetsHelp') },
          ].map((option) => (
            <Pressable
              key={`${listKey}-${option.value}`}
              style={({ pressed }) => [pressed ? styles.pressed : null]}
              onPress={() => setTargetMode(listKey, option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === option.value }}
              accessibilityLabel={`${title}: ${option.title}`}>
              <AppCard style={[styles.selectorCard, mode === option.value ? styles.selectorCardActive : null]}>
                <AppText variant="h3">{option.title}</AppText>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                  {option.description}
                </AppText>
              </AppCard>
            </Pressable>
          ))}
        </View>

        <AppText variant="caption" color={theme.colors.textSecondary}>
          {targetSummary(form[listKey], targetOptionMap, t)}
        </AppText>

        {mode === 'SPECIFIC_TARGETS' ? (
          <View style={styles.stack}>
            <SelectDropdownField
              label={t('admin.targetType')}
              value={targetTypeFilters[listKey]}
              options={targetTypeSelectOptions}
              onChange={(nextValue) => {
                setTargetTypeFilters((prev) => ({ ...prev, [listKey]: nextValue as MenuEntityType }));
                setTargetQueries((prev) => ({ ...prev, [listKey]: '' }));
              }}
            />
            <AppInput
              label={t('admin.targetSearch')}
              value={targetQueries[listKey]}
              onChangeText={(value) => setTargetQueries((prev) => ({ ...prev, [listKey]: value }))}
              placeholder={t('admin.targetSearchPlaceholder')}
            />

            <View style={styles.selectedTargetsBlock}>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                {t('admin.selectedTargets')}
              </AppText>
              {selectedLabels.length === 0 ? (
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  {t('admin.noTargetsSelected')}
                </AppText>
              ) : (
                <View style={styles.selectorStack}>
                  {selectedLabels.map((option) => (
                    <AppCard key={`${listKey}-${targetKey(option)}`} style={styles.targetRowCard}>
                      <View style={[styles.targetRow, mirroredRow(isRTL)]}>
                        <View style={styles.targetTextWrap}>
                          <AppText variant="bodySmall">{option.label}</AppText>
                        </View>
                        <AppButton title={t('common.remove')} variant="ghost" fullWidth={false} onPress={() => removeTarget(listKey, option)} />
                      </View>
                    </AppCard>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.selectedTargetsBlock}>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                {t('admin.matchingTargets')}
              </AppText>
              {filteredOptions.length === 0 ? (
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  {t('admin.noMatchingTargets')}
                </AppText>
              ) : (
                <View style={styles.selectorStack}>
                  {filteredOptions.map((option) => (
                    <AppCard key={`${listKey}-${targetKey(option)}`} style={styles.targetRowCard}>
                      <View style={[styles.targetRow, mirroredRow(isRTL)]}>
                        <View style={styles.targetTextWrap}>
                          <AppText variant="bodySmall">{option.label}</AppText>
                        </View>
                        <AppButton title={t('common.add')} variant="secondary" fullWidth={false} onPress={() => addTarget(listKey, option)} accessibilityLabel={option.label} />
                      </View>
                    </AppCard>
                  ))}
                </View>
              )}
            </View>
          </View>
        ) : null}
      </AdminPageSection>
    );
  };

  if (loading) return <DetailPageSkeleton isRTL={isRTL} sections={4} />;
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
              helperText={formErrors.translation}
            />
          </AdminPageSection>

          <AdminPageSection title={t('admin.offerRules')} style={styles.innerSection}>
            {renderSelectorCards({
              accessibilityPrefix: t('admin.offerBehavior'),
              options: behaviorCards,
              selectedValue: form.behavior,
              onSelect: (value) =>
                setForm((prev) => ({
                  ...prev,
                  behavior: value,
                  eligibility_mode: value !== 'FIXED_DISCOUNT' && prev.eligibility_mode === 'NEW_CUSTOMERS' ? 'EVERYONE' : prev.eligibility_mode,
                  value: value === 'BUY_N_GET_M_FREE' ? '' : prev.value,
                  buy_quantity: value === 'BUY_N_GET_M_FREE' ? prev.buy_quantity : '',
                  free_quantity: value === 'BUY_N_GET_M_FREE' ? prev.free_quantity : '',
                })),
            })}
            {form.behavior === 'BUY_N_GET_M_FREE' ? (
              <View style={[styles.twoCol, mirroredRow(isRTL), isCompact ? styles.stackCol : null]}>
                <AppInput label={t('admin.buyQuantity')} value={form.buy_quantity} keyboardType="number-pad" error={formErrors.buy_quantity} onChangeText={(value) => setForm((prev) => ({ ...prev, buy_quantity: value }))} />
                <AppInput label={t('admin.freeQuantity')} value={form.free_quantity} keyboardType="number-pad" error={formErrors.free_quantity} onChangeText={(value) => setForm((prev) => ({ ...prev, free_quantity: value }))} />
              </View>
            ) : form.behavior === 'FREE_DELIVERY_ABOVE_AMOUNT' ? (
              <AppInput label={t('admin.minimumOrderAmount')} value={form.value} keyboardType="decimal-pad" error={formErrors.value} onChangeText={(value) => setForm((prev) => ({ ...prev, value }))} />
            ) : (
              <AppInput label={t('admin.discountAmount')} value={form.value} keyboardType="decimal-pad" error={formErrors.value} onChangeText={(value) => setForm((prev) => ({ ...prev, value }))} />
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
              <DateTimeField
                label={t('admin.startTime')}
                mode="time"
                value={form.starts_at}
                onChange={(value) =>
                  setForm((prev) => {
                    const next = new Date(prev.starts_at);
                    next.setHours(value.getHours(), value.getMinutes(), 0, 0);
                    return { ...prev, starts_at: next };
                  })
                }
              />
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
              <DateTimeField
                label={t('admin.endTime')}
                mode="time"
                value={form.ends_at}
                onChange={(value) =>
                  setForm((prev) => {
                    const next = new Date(prev.ends_at);
                    next.setHours(value.getHours(), value.getMinutes(), 0, 0);
                    return { ...prev, ends_at: next };
                  })
                }
              />
            </View>
            {formErrors.dateRange ? <AppText variant="caption" color={theme.colors.error}>{formErrors.dateRange}</AppText> : null}
            <AppText variant="caption" color={theme.colors.textSecondary}>{`${t('admin.timeRange')}: ${timezone}`}</AppText>
          </AdminPageSection>

          <AdminPageSection title={t('admin.eligibilityTrigger')} style={styles.innerSection}>
            {renderSelectorCards({
              accessibilityPrefix: t('admin.eligibilityChoice'),
              options: eligibilityCards,
              selectedValue: form.eligibility_mode,
              onSelect: (value) => setForm((prev) => ({ ...prev, eligibility_mode: value, required_completed_orders: value === 'AFTER_ORDER_COUNT' ? prev.required_completed_orders : '' })),
            })}
            {form.eligibility_mode === 'AFTER_ORDER_COUNT' ? (
              <AppInput
                label={t('admin.requiredCompletedOrders')}
                value={form.required_completed_orders}
                keyboardType="number-pad"
                error={formErrors.required_completed_orders}
                onChangeText={(value) => setForm((prev) => ({ ...prev, required_completed_orders: value }))}
                placeholder={t('admin.requiredCompletedOrdersPlaceholder')}
              />
            ) : null}
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>{eligibilityPreview}</AppText>
          </AdminPageSection>

          {form.behavior === 'BUY_N_GET_M_FREE' ? (
            <View style={styles.stack}>
              {renderTargetPicker({ listKey: 'buy_targets', title: t('admin.buyFrom'), description: t('admin.buyFromHelp'), mode: buyMode })}
              {renderTargetPicker({ listKey: 'free_targets', title: t('admin.freeFrom'), description: t('admin.freeFromHelp'), mode: freeMode })}
            </View>
          ) : form.behavior === 'FIXED_DISCOUNT' ? (
            renderTargetPicker({ listKey: 'scope_targets', title: t('admin.eligibleMenuItems'), description: t('admin.scopeChooserHelp'), mode: scopeMode })
          ) : null}

          <AdminPageSection title={t('admin.offerStatusSection')} style={styles.innerSection}>
            <View style={[styles.actionPair, mirroredRow(isRTL), isCompact ? styles.stackCol : null]}>
              <AppButton title={t('admin.active')} variant={form.is_active ? 'primary' : 'secondary'} onPress={() => setForm((prev) => ({ ...prev, is_active: true }))} style={styles.flexButton} />
              <AppButton title={t('admin.inactive')} variant={!form.is_active ? 'primary' : 'secondary'} onPress={() => setForm((prev) => ({ ...prev, is_active: false }))} style={styles.flexButton} />
            </View>
            <InfoLine label={t('admin.offerSummary')} value={offerSummaryPreview} numberOfLines={4} />
            {form.behavior === 'BUY_N_GET_M_FREE' ? (
              <>
                <InfoLine label={t('admin.buyFrom')} value={buyPreview} numberOfLines={2} />
                <InfoLine label={t('admin.freeFrom')} value={freePreview} numberOfLines={2} />
              </>
            ) : form.behavior === 'FIXED_DISCOUNT' ? (
              <InfoLine label={t('admin.scopeSummary')} value={scopePreview} numberOfLines={2} />
            ) : null}
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
                : promotion.type === 'FREE_DELIVERY_ABOVE_AMOUNT'
                  ? `${t('admin.minimumOrderAmount')} ${promotion.value}`
                  : `${t('admin.discountAmount')} ${promotion.value}`;
            const cardSummary = buildOfferSummary([
              promotion.type === 'BUY_N_GET_M_FREE'
                ? t('admin.offerBehaviorBuyGet')
                : promotion.type === 'FREE_DELIVERY_ABOVE_AMOUNT'
                  ? t('admin.offerBehaviorFreeDelivery')
                  : t('admin.offerBehaviorDiscount'),
              ruleValue,
              eligibilitySummary,
              scopeSummary,
            ]);

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
                  <InfoLine
                    label={t('admin.offerBehavior')}
                    value={
                      promotion.type === 'BUY_N_GET_M_FREE'
                        ? t('admin.offerBehaviorBuyGet')
                        : promotion.type === 'FREE_DELIVERY_ABOVE_AMOUNT'
                          ? t('admin.offerBehaviorFreeDelivery')
                          : t('admin.offerBehaviorDiscount')
                    }
                  />
                  <InfoLine label={promotion.type === 'BUY_N_GET_M_FREE' ? t('admin.buyGetRule') : promotion.type === 'FREE_DELIVERY_ABOVE_AMOUNT' ? t('admin.minimumOrderAmount') : t('admin.discountAmount')} value={ruleValue} />
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
  innerSection: { padding: theme.spacing.md, backgroundColor: theme.colors.sectionBackground, gap: theme.spacing.md },
  selectorStack: { gap: theme.spacing.sm },
  twoCol: { flexDirection: 'row', gap: theme.spacing.sm },
  stackCol: { flexDirection: 'column' },
  flexButton: { flex: 1 },
  selectorCard: { gap: theme.spacing.xs, backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
  selectorCardActive: { backgroundColor: theme.colors.secondaryCream, borderColor: theme.colors.primary300 },
  targetRowCard: { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
  targetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  targetTextWrap: { flex: 1 },
  selectedTargetsBlock: { gap: theme.spacing.sm },
  actionPair: { flexDirection: 'row', gap: theme.spacing.sm },
  pressed: { opacity: 0.82 },
  card: { gap: theme.spacing.sm, backgroundColor: theme.colors.secondaryCream, borderColor: theme.colors.primary200 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing.sm },
  badges: { gap: theme.spacing.xs, alignItems: 'flex-end' },
  infoBox: { gap: theme.spacing.sm, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, padding: theme.spacing.sm },
});
