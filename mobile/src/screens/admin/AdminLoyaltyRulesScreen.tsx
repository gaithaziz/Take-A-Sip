import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ActionRow } from '@/components/admin/ActionRow';
import { AdminPageSection } from '@/components/admin/AdminPageSection';
import { ExpandableText } from '@/components/admin/ExpandableText';
import { InfoLine } from '@/components/admin/InfoLine';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { adminService } from '@/services/adminService';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { LoyaltyRule } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { mirroredRow } from '@/utils/layout';

type RuleForm = {
  required_orders: string;
  reward_type: string;
  reward_value: string;
  is_active: boolean;
};

const rewardTypeOptions = ['FREE_ITEM', 'DISCOUNT', 'GIFT'];
const rewardTypeLabel = (type: string, t: (key: string) => string): string => {
  if (type === 'FREE_ITEM') return t('admin.rewardTypeFreeItem');
  if (type === 'DISCOUNT') return t('admin.rewardTypeDiscount');
  if (type === 'GIFT') return t('admin.rewardTypeGift');
  return type;
};

const defaultForm: RuleForm = {
  required_orders: '5',
  reward_type: 'FREE_ITEM',
  reward_value: '',
  is_active: true,
};

export const AdminLoyaltyRulesScreen = () => {
  const { t } = useAppTranslation();
  const { isRTL } = useLanguage();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 390;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState<LoyaltyRule[]>([]);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [form, setForm] = useState<RuleForm>(defaultForm);
  const [formErrors, setFormErrors] = useState<{ required_orders?: string; reward_value?: string }>({});
  const [mutatingRuleId, setMutatingRuleId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminService.listLoyaltyRules();
      setRules(response.rules);
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
    setEditingRuleId(null);
    setForm(defaultForm);
  };

  const startEdit = (rule: LoyaltyRule) => {
    setEditingRuleId(rule.id);
    setForm({
      required_orders: String(rule.required_orders),
      reward_type: rule.reward_type,
      reward_value: rule.reward_value,
      is_active: rule.is_active,
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const nextErrors: { required_orders?: string; reward_value?: string } = {};
    if (!form.required_orders || Number(form.required_orders) < 1) {
      nextErrors.required_orders = t('admin.invalidRequiredOrders');
    }
    if (!form.reward_value.trim()) {
      nextErrors.reward_value = t('validation.requiredFields');
    }
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const save = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      const payload = {
        required_orders: Number(form.required_orders),
        reward_type: form.reward_type.trim(),
        reward_value: form.reward_value.trim(),
        is_active: form.is_active,
      };

      if (editingRuleId) {
        await adminService.updateLoyaltyRule(editingRuleId, payload);
      } else {
        await adminService.createLoyaltyRule(payload);
      }

      resetForm();
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule: LoyaltyRule) => {
    try {
      setMutatingRuleId(rule.id);
      await adminService.toggleLoyaltyRule(rule.id);
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    } finally {
      setMutatingRuleId(null);
    }
  };

  const sortedRules = useMemo(() => [...rules].sort((a, b) => a.required_orders - b.required_orders), [rules]);

  const canSave = !saving && Boolean(form.reward_value.trim()) && Number(form.required_orders) >= 1;

  const renderRule = ({ item: rule }: { item: LoyaltyRule }) => (
    <AppCard style={styles.itemCard}>
      <View style={[styles.itemHeader, mirroredRow(isRTL)]}>
        <View style={styles.grow}>
          <ExpandableText value={`${rule.required_orders} ${t('admin.ordersThreshold')}`} variant="h3" numberOfLines={2} />
        </View>
        <BadgeChip label={rule.is_active ? t('admin.active') : t('admin.inactive')} tone={rule.is_active ? 'success' : 'default'} />
      </View>
      <View style={styles.infoBox}>
        <InfoLine label={t('admin.rewardType')} value={rewardTypeLabel(rule.reward_type, t)} numberOfLines={2} />
        <InfoLine label={t('admin.rewardValue')} value={rule.reward_value} numberOfLines={2} />
      </View>

      <ActionRow compact={isCompact}>
        <AppButton title={t('admin.edit')} variant="secondary" onPress={() => startEdit(rule)} style={styles.flexButton} disabled={mutatingRuleId === rule.id} />
        <AppButton
          title={rule.is_active ? t('admin.disable') : t('admin.enable')}
          variant="ghost"
          onPress={() => void toggleRule(rule)}
          fullWidth={false}
          loading={mutatingRuleId === rule.id}
          disabled={Boolean(mutatingRuleId && mutatingRuleId !== rule.id)}
        />
      </ActionRow>
    </AppCard>
  );

  return (
    <FlatList
      data={loading || error ? [] : sortedRules}
      renderItem={renderRule}
      keyExtractor={(rule) => rule.id}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <AppText variant="h1">{t('admin.loyaltyTitle')}</AppText>

          <AdminPageSection title={editingRuleId ? t('admin.editLoyaltyRule') : t('admin.createLoyaltyRule')}>
            <View style={styles.formStack}>
              <View style={styles.formGroup}>
                <AppInput
                  label={t('admin.requiredOrders')}
                  value={form.required_orders}
                  keyboardType="number-pad"
                  error={formErrors.required_orders}
                  onChangeText={(value) => {
                    setForm((prev) => ({ ...prev, required_orders: value }));
                    setFormErrors((prev) => ({ ...prev, required_orders: undefined }));
                  }}
                />
              </View>

              <View style={styles.formGroup}>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>{t('admin.rewardType')}</AppText>
                <View style={[styles.segmentRow, mirroredRow(isRTL)]}>
                  {rewardTypeOptions.map((option) => (
                    <Pressable
                      key={option}
                      style={[styles.segmentChip, form.reward_type === option ? styles.segmentChipActive : null]}
                      onPress={() => setForm((prev) => ({ ...prev, reward_type: option }))}
                      accessibilityRole="button"
                      accessibilityState={{ selected: form.reward_type === option }}
                      accessibilityLabel={`${t('admin.rewardType')}: ${rewardTypeLabel(option, t)}`}>
                      <AppText variant="caption">{rewardTypeLabel(option, t)}</AppText>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <AppInput
                  label={t('admin.rewardValue')}
                  value={form.reward_value}
                  error={formErrors.reward_value}
                  onChangeText={(value) => {
                    setForm((prev) => ({ ...prev, reward_value: value }));
                    setFormErrors((prev) => ({ ...prev, reward_value: undefined }));
                  }}
                />
              </View>

              <View style={styles.formGroup}>
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
                  title={editingRuleId ? t('admin.saveChanges') : t('admin.createLoyaltyRule')}
                  loading={saving}
                  disabled={!canSave}
                  onPress={() => void save()}
                  style={styles.flexButton}
                />
                {editingRuleId ? <AppButton title={t('common.cancel')} variant="ghost" onPress={resetForm} fullWidth={false} /> : null}
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
          <EmptyState title={t('admin.noLoyaltyTitle')} subtitle={t('admin.noLoyaltySubtitle')} />
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
    gap: theme.spacing.lg,
  },
  formGroup: {
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.secondaryCream,
    padding: theme.spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  itemCard: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
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
  grow: {
    flex: 1,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    flexWrap: 'wrap',
  },
  segmentChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  segmentChipActive: {
    borderColor: theme.colors.primary300,
    backgroundColor: theme.colors.secondaryCream,
  },
  separator: {
    height: theme.spacing.md,
  },
});
