import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

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
  const isCompact = width < 390;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState<LoyaltyRule[]>([]);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [form, setForm] = useState<RuleForm>(defaultForm);

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
  };

  const save = async () => {
    if (!form.required_orders || !form.reward_type.trim() || !form.reward_value.trim()) {
      Alert.alert(t('common.error'), t('validation.requiredFields'));
      return;
    }

    if (Number(form.required_orders) < 1) {
      Alert.alert(t('common.error'), t('admin.invalidRequiredOrders'));
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
      await adminService.toggleLoyaltyRule(rule.id);
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    }
  };

  const sortedRules = useMemo(() => [...rules].sort((a, b) => a.required_orders - b.required_orders), [rules]);

  if (loading) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (error) {
    return <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={load} />;
  }

  return (
    <AppShell refreshing={loading} onRefresh={load}>
      <AppText variant="h1">{t('admin.loyaltyTitle')}</AppText>

      <AdminPageSection title={editingRuleId ? t('admin.editLoyaltyRule') : t('admin.createLoyaltyRule')}>
        <View style={styles.formStack}>
          <AppInput
            label={t('admin.requiredOrders')}
            value={form.required_orders}
            keyboardType="number-pad"
            onChangeText={(value) => setForm((prev) => ({ ...prev, required_orders: value }))}
          />

          <View>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>{t('admin.rewardType')}</AppText>
            <View style={[styles.segmentRow, mirroredRow(isRTL)]}>
              {rewardTypeOptions.map((option) => (
                <Pressable key={option} style={[styles.segmentChip, form.reward_type === option ? styles.segmentChipActive : null]} onPress={() => setForm((prev) => ({ ...prev, reward_type: option }))}>
                  <AppText variant="caption">{rewardTypeLabel(option, t)}</AppText>
                </Pressable>
              ))}
            </View>
          </View>

          <AppInput
            label={t('admin.rewardValue')}
            value={form.reward_value}
            onChangeText={(value) => setForm((prev) => ({ ...prev, reward_value: value }))}
          />

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
            <AppButton title={editingRuleId ? t('admin.saveChanges') : t('admin.createLoyaltyRule')} loading={saving} onPress={() => void save()} style={styles.flexButton} />
            {editingRuleId ? <AppButton title={t('common.cancel')} variant="ghost" onPress={resetForm} fullWidth={false} /> : null}
          </ActionRow>
        </View>
      </AdminPageSection>

      {sortedRules.length === 0 ? (
        <EmptyState title={t('admin.noLoyaltyTitle')} subtitle={t('admin.noLoyaltySubtitle')} />
      ) : (
        sortedRules.map((rule) => (
          <AppCard key={rule.id}>
            <View style={[styles.itemHeader, mirroredRow(isRTL)]}>
              <Pressable onPress={() => Alert.alert('', rule.reward_value)} style={styles.grow}>
                <ExpandableText value={`${rule.required_orders} ${t('admin.ordersThreshold')}`} variant="h3" numberOfLines={2} />
              </Pressable>
              <BadgeChip label={rule.is_active ? t('admin.active') : t('admin.inactive')} tone={rule.is_active ? 'success' : 'default'} />
            </View>
            <InfoLine label={t('admin.rewardType')} value={rewardTypeLabel(rule.reward_type, t)} numberOfLines={2} />
            <InfoLine label={t('admin.rewardValue')} value={rule.reward_value} numberOfLines={2} />

            <ActionRow compact={isCompact}>
              <AppButton title={t('admin.edit')} variant="secondary" onPress={() => startEdit(rule)} style={styles.flexButton} />
              <AppButton title={rule.is_active ? t('admin.disable') : t('admin.enable')} variant="ghost" onPress={() => void toggleRule(rule)} fullWidth={false} />
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
});
