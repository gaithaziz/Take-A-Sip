import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

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
import { InfoLine } from '@/components/admin/InfoLine';
import { DetailPageSkeleton } from '@/components/skeleton/PageSkeletons';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { RootStackParamList } from '@/navigation/types';
import { adminService } from '@/services/adminService';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { MenuEntityType, MenuSchedule, Section } from '@/types/api';
import {
  AdminSubgroupOption,
  buildAdminSubgroupOptions,
  buildAdminTargetOptions,
  targetKey,
} from '@/utils/adminMenuPreview';
import { getApiErrorMessage } from '@/utils/errors';
import { getLocalizedValue } from '@/utils/i18n';
import { mirroredRow } from '@/utils/layout';
import { getStoreTimeZone } from '@/utils/format';

type ScheduleEditorNavigation = NativeStackNavigationProp<RootStackParamList>;
type ScheduleEditorRoute = RouteProp<RootStackParamList, 'AdminScheduleEditor'>;
type TargetMode = MenuEntityType | 'subgroup';

type ScheduleForm = {
  target_mode: TargetMode;
  entity_type: MenuEntityType;
  entity_id: string;
  subgroup_id: string;
  subgroup_item_ids: string[];
  start_time: string;
  end_time: string;
  days_of_week: number[];
  is_active: boolean;
};

const defaultForm: ScheduleForm = {
  target_mode: 'section',
  entity_type: 'section',
  entity_id: '',
  subgroup_id: '',
  subgroup_item_ids: [],
  start_time: '07:00',
  end_time: '11:00',
  days_of_week: [0, 1, 2, 3, 4, 5, 6],
  is_active: true,
};

const targetModes: TargetMode[] = ['section', 'subgroup', 'item', 'type', 'size', 'addon'];

const timeToDate = (value: string): Date => {
  const [h, m] = value.split(':').map(Number);
  const next = new Date();
  next.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return next;
};

const dateToTime = (value: Date): string =>
  `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;

export const AdminScheduleEditorScreen = () => {
  const { t, language } = useAppTranslation();
  const { isRTL } = useLanguage();
  const route = useRoute<ScheduleEditorRoute>();
  const navigation = useNavigation<ScheduleEditorNavigation>();
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [form, setForm] = useState<ScheduleForm>(defaultForm);
  const [targetQuery, setTargetQuery] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [appliedRouteScheduleId, setAppliedRouteScheduleId] = useState<string | null>(null);
  const editingSchedule = route.params?.schedule;
  const timezone = getStoreTimeZone();

  const dayLabelByValue = useMemo<Record<number, string>>(
    () => ({
      0: t('admin.dayMon'),
      1: t('admin.dayTue'),
      2: t('admin.dayWed'),
      3: t('admin.dayThu'),
      4: t('admin.dayFri'),
      5: t('admin.daySat'),
      6: t('admin.daySun'),
    }),
    [t],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const menu = await adminService.getMenuTree();
      setSections(menu.sections);
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!editingSchedule || appliedRouteScheduleId === editingSchedule.id) return;
    setForm({
      target_mode: editingSchedule.entity_type,
      entity_type: editingSchedule.entity_type,
      entity_id: editingSchedule.entity_id,
      subgroup_id: '',
      subgroup_item_ids: [],
      start_time: editingSchedule.start_time,
      end_time: editingSchedule.end_time,
      days_of_week: editingSchedule.days_of_week,
      is_active: editingSchedule.is_active,
    });
    setAppliedRouteScheduleId(editingSchedule.id);
  }, [appliedRouteScheduleId, editingSchedule]);

  const targetOptions = useMemo(() => buildAdminTargetOptions(sections, language), [language, sections]);
  const targetOptionMap = useMemo(() => new Map(targetOptions.map((option) => [targetKey(option), option])), [targetOptions]);
  const subgroupOptions = useMemo(() => buildAdminSubgroupOptions(sections, language), [language, sections]);

  const filteredTargets = useMemo(() => {
    const normalized = targetQuery.trim().toLowerCase();
    return targetOptions
      .filter((option) => option.entity_type === form.entity_type)
      .filter((option) => !normalized || option.label.toLowerCase().includes(normalized) || option.label_en.toLowerCase().includes(normalized) || option.label_ar.toLowerCase().includes(normalized))
      .slice(0, 18);
  }, [form.entity_type, targetOptions, targetQuery]);

  const filteredSubgroups = useMemo(() => {
    const normalized = targetQuery.trim().toLowerCase();
    return subgroupOptions
      .filter((option) => !normalized || option.title.toLowerCase().includes(normalized) || option.title_en.toLowerCase().includes(normalized) || option.title_ar.toLowerCase().includes(normalized))
      .slice(0, 18);
  }, [subgroupOptions, targetQuery]);

  const selectedLabel = useMemo(() => {
    if (form.target_mode === 'subgroup') {
      return subgroupOptions.find((option) => option.id === form.subgroup_id)?.title ?? t('admin.noTargetsSelected');
    }
    return targetOptionMap.get(`${form.entity_type}:${form.entity_id}`)?.label ?? t('admin.noTargetsSelected');
  }, [form.entity_id, form.entity_type, form.subgroup_id, form.target_mode, subgroupOptions, t, targetOptionMap]);

  const previewSchedules = useMemo<MenuSchedule[]>(() => {
    if (form.target_mode === 'subgroup') {
      return form.subgroup_item_ids.map((entity_id, index) => ({
        id: `draft-subgroup-schedule-${index}`,
        entity_type: 'item',
        entity_id,
        start_time: form.start_time,
        end_time: form.end_time,
        days_of_week: form.days_of_week,
        is_active: form.is_active,
      }));
    }

    if (!form.entity_id) return [];
    return [{
      id: editingSchedule?.id ?? 'draft-schedule',
      entity_type: form.entity_type,
      entity_id: form.entity_id,
      start_time: form.start_time,
      end_time: form.end_time,
      days_of_week: form.days_of_week,
      is_active: form.is_active,
    }];
  }, [editingSchedule?.id, form]);

  const setTargetMode = (mode: TargetMode) => {
    setFormError(null);
    setTargetQuery('');
    setForm((prev) => ({
      ...prev,
      target_mode: mode,
      entity_type: mode === 'subgroup' ? 'item' : mode,
      entity_id: '',
      subgroup_id: '',
      subgroup_item_ids: [],
    }));
  };

  const selectSubgroup = (subgroup: AdminSubgroupOption) => {
    setFormError(null);
    setForm((prev) => ({
      ...prev,
      target_mode: 'subgroup',
      entity_type: 'item',
      entity_id: '',
      subgroup_id: subgroup.id,
      subgroup_item_ids: subgroup.item_ids,
    }));
  };

  const toggleDay = (day: number) => {
    setFormError(null);
    setForm((prev) => {
      if (prev.days_of_week.includes(day)) {
        return { ...prev, days_of_week: prev.days_of_week.filter((value) => value !== day) };
      }
      return { ...prev, days_of_week: [...prev.days_of_week, day].sort((a, b) => a - b) };
    });
  };

  const setDayPreset = (days: number[]) => {
    setFormError(null);
    setForm((prev) => ({ ...prev, days_of_week: days }));
  };

  const canSave =
    !saving &&
    Boolean(form.start_time) &&
    Boolean(form.end_time) &&
    form.start_time !== form.end_time &&
    form.days_of_week.length > 0 &&
    (form.target_mode === 'subgroup' ? form.subgroup_item_ids.length > 0 : Boolean(form.entity_id));

  const showTargetUnavailable = () => {
    const message = t('admin.targetNoLongerAvailable');
    setFormError(message);
    Alert.alert(t('common.error'), message);
  };

  const save = async () => {
    if (!canSave) {
      setFormError(form.start_time === form.end_time ? t('admin.invalidTimeRange') : t('validation.requiredFields'));
      return;
    }

    try {
      setSaving(true);
      setFormError(null);
      if (editingSchedule) {
        await adminService.updateSchedule(editingSchedule.id, {
          start_time: form.start_time,
          end_time: form.end_time,
          days_of_week: form.days_of_week,
          is_active: form.is_active,
        });
      } else {
        const freshMenu = await adminService.getMenuTree({ force: true });
        setSections(freshMenu.sections);

        if (form.target_mode === 'subgroup') {
          const freshSubgroup = buildAdminSubgroupOptions(freshMenu.sections, language).find(
            (option) => option.id === form.subgroup_id,
          );
          if (!freshSubgroup || freshSubgroup.item_ids.length === 0) {
            showTargetUnavailable();
            return;
          }

          await Promise.all(
            freshSubgroup.item_ids.map((entity_id) =>
              adminService.createSchedule({
                entity_type: 'item',
                entity_id,
                start_time: form.start_time,
                end_time: form.end_time,
                days_of_week: form.days_of_week,
              }),
            ),
          );
        } else {
          const freshTargetOptions = buildAdminTargetOptions(freshMenu.sections, language);
          const freshTargetOptionMap = new Map(freshTargetOptions.map((option) => [targetKey(option), option]));
          if (!freshTargetOptionMap.has(targetKey({ entity_type: form.entity_type, entity_id: form.entity_id }))) {
            showTargetUnavailable();
            return;
          }

          await adminService.createSchedule({
            entity_type: form.entity_type,
            entity_id: form.entity_id,
            start_time: form.start_time,
            end_time: form.end_time,
            days_of_week: form.days_of_week,
          });
        }
      }
      if (navigation.canGoBack()) navigation.goBack();
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    } finally {
      setSaving(false);
    }
  };

  const targetModeLabel = (mode: TargetMode) =>
    mode === 'subgroup' ? t('admin.subgroup') : t(`admin.${mode}`);

  if (loading) return <DetailPageSkeleton isRTL={isRTL} sections={4} />;
  if (error) return <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={load} />;

  return (
    <AppShell refreshing={loading} onRefresh={load}>
      <View style={styles.heading}>
        <View style={[styles.headingRow, mirroredRow(isRTL)]}>
          <View style={styles.headingText}>
            <AppText variant="h1" align={isRTL ? 'right' : 'left'}>
              {editingSchedule ? t('admin.editSchedule') : t('admin.createSchedule')}
            </AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary} align={isRTL ? 'right' : 'left'}>
              {t('admin.scheduleEditorSubtitle')}
            </AppText>
          </View>
          <AppButton title={t('common.back')} variant="ghost" fullWidth={false} onPress={() => navigation.goBack()} />
        </View>
      </View>

      <AdminPageSection title={t('admin.scheduleTarget')} subtitle={t('admin.scheduleTargetHelp')}>
        {editingSchedule ? (
          <AppCard style={styles.warningCard}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {t('admin.scheduleEditTargetLocked')}
            </AppText>
          </AppCard>
        ) : null}
        <View style={[styles.chipRow, mirroredRow(isRTL)]}>
          {targetModes.map((mode) => (
            <Pressable
              key={mode}
              disabled={Boolean(editingSchedule)}
              style={[styles.modeChip, form.target_mode === mode ? styles.modeChipActive : null, editingSchedule ? styles.disabledChip : null]}
              onPress={() => setTargetMode(mode)}
              accessibilityRole="button"
              accessibilityState={{ selected: form.target_mode === mode, disabled: Boolean(editingSchedule) }}
              accessibilityLabel={targetModeLabel(mode)}>
              <AppText variant="caption" color={form.target_mode === mode ? theme.colors.primary700 : theme.colors.textSecondary}>
                {targetModeLabel(mode)}
              </AppText>
            </Pressable>
          ))}
        </View>

        <InfoLine label={t('admin.selectedTargets')} value={selectedLabel} numberOfLines={3} />

        {!editingSchedule ? (
          <View style={styles.stack}>
            <AppInput
              label={t('admin.targetSearch')}
              value={targetQuery}
              onChangeText={setTargetQuery}
              placeholder={form.target_mode === 'subgroup' ? t('admin.searchSubgroupsPlaceholder') : t('admin.targetSearchPlaceholder')}
            />

            {form.target_mode === 'subgroup' ? (
              <View style={styles.optionStack}>
                {filteredSubgroups.length === 0 ? (
                  <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.noMatchingTargets')}</AppText>
                ) : (
                  filteredSubgroups.map((subgroup) => {
                    const section = sections.find((entry) => entry.id === subgroup.section_id);
                    const sectionName = section ? getLocalizedValue(section, language, 'name') : '';
                    const selected = form.subgroup_id === subgroup.id;
                    return (
                      <Pressable
                        key={subgroup.id}
                        style={[styles.optionCard, selected ? styles.optionCardActive : null]}
                        onPress={() => selectSubgroup(subgroup)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={subgroup.title}>
                        <View style={[styles.optionRow, mirroredRow(isRTL)]}>
                          <View style={styles.optionText}>
                            <AppText variant="bodySmall" align={isRTL ? 'right' : 'left'}>{subgroup.title}</AppText>
                            <AppText variant="caption" color={theme.colors.textSecondary} align={isRTL ? 'right' : 'left'}>
                              {`${sectionName} | ${subgroup.item_ids.length} ${t('admin.itemsLabel')}`}
                            </AppText>
                          </View>
                          {selected ? <BadgeChip label={t('admin.selected')} tone="success" /> : null}
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>
            ) : (
              <View style={styles.optionStack}>
                {filteredTargets.length === 0 ? (
                  <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.noMatchingTargets')}</AppText>
                ) : (
                  filteredTargets.map((option) => {
                    const selected = form.entity_id === option.entity_id;
                    return (
                      <Pressable
                        key={targetKey(option)}
                        style={[styles.optionCard, selected ? styles.optionCardActive : null]}
                        onPress={() => {
                          setFormError(null);
                          setForm((prev) => ({
                            ...prev,
                            entity_type: option.entity_type,
                            entity_id: option.entity_id,
                            subgroup_id: '',
                            subgroup_item_ids: [],
                          }));
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={option.label}>
                        <View style={[styles.optionRow, mirroredRow(isRTL)]}>
                          <View style={styles.optionText}>
                            <AppText variant="bodySmall" align={isRTL ? 'right' : 'left'}>{option.label}</AppText>
                          </View>
                          {selected ? <BadgeChip label={t('admin.selected')} tone="success" /> : null}
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </View>
            )}
          </View>
        ) : null}
      </AdminPageSection>

      <AdminPageSection title={t('admin.timeRange')} subtitle={`${t('admin.storeTimezone')}: ${timezone}`}>
        <View style={[styles.twoCol, mirroredRow(isRTL), isCompact ? styles.stackCol : null]}>
          <DateTimeField
            label={t('admin.startTime')}
            mode="time"
            value={timeToDate(form.start_time)}
            onChange={(value) => {
              setFormError(null);
              setForm((prev) => ({ ...prev, start_time: dateToTime(value) }));
            }}
          />
          <DateTimeField
            label={t('admin.endTime')}
            mode="time"
            value={timeToDate(form.end_time)}
            onChange={(value) => {
              setFormError(null);
              setForm((prev) => ({ ...prev, end_time: dateToTime(value) }));
            }}
          />
        </View>
        <AppText variant="caption" color={theme.colors.textSecondary}>
          {t('admin.scheduleAvailabilityHint')}
        </AppText>
      </AdminPageSection>

      <AdminPageSection title={t('admin.daysOfWeek')}>
        <View style={[styles.chipRow, mirroredRow(isRTL)]}>
          <Pressable style={styles.modeChip} onPress={() => setDayPreset([0, 1, 2, 3, 4, 5, 6])}>
            <AppText variant="caption">{t('admin.everyDay')}</AppText>
          </Pressable>
          <Pressable style={styles.modeChip} onPress={() => setDayPreset([0, 1, 2, 3, 4])}>
            <AppText variant="caption">{t('admin.weekdays')}</AppText>
          </Pressable>
          <Pressable style={styles.modeChip} onPress={() => setDayPreset([5, 6])}>
            <AppText variant="caption">{t('admin.weekend')}</AppText>
          </Pressable>
        </View>
        <View style={[styles.chipRow, mirroredRow(isRTL)]}>
          {Object.entries(dayLabelByValue).map(([value, label]) => {
            const day = Number(value);
            const selected = form.days_of_week.includes(day);
            return (
              <Pressable
                key={value}
                style={[styles.modeChip, selected ? styles.modeChipActive : null]}
                onPress={() => toggleDay(day)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={label}>
                <AppText variant="caption" color={selected ? theme.colors.primary700 : theme.colors.textSecondary}>
                  {label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </AdminPageSection>

      <AdminPageSection title={t('admin.reviewAndPreview')}>
        {editingSchedule ? (
          <View style={[styles.actionPair, mirroredRow(isRTL), isCompact ? styles.stackCol : null]}>
            <AppButton title={t('admin.active')} variant={form.is_active ? 'primary' : 'secondary'} onPress={() => setForm((prev) => ({ ...prev, is_active: true }))} style={styles.flexButton} />
            <AppButton title={t('admin.inactive')} variant={!form.is_active ? 'primary' : 'secondary'} onPress={() => setForm((prev) => ({ ...prev, is_active: false }))} style={styles.flexButton} />
          </View>
        ) : null}
        <InfoLine label={t('admin.selectedTargets')} value={selectedLabel} numberOfLines={3} />
        <InfoLine label={t('admin.timeRange')} value={`${form.start_time} - ${form.end_time}`} />
        <InfoLine label={t('admin.daysOfWeek')} value={form.days_of_week.map((day) => dayLabelByValue[day]).join(', ')} numberOfLines={2} />
        {form.target_mode === 'subgroup' ? (
          <AppCard style={styles.warningCard}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {`${t('admin.subgroupScheduleFanout')} ${form.subgroup_item_ids.length}`}
            </AppText>
          </AppCard>
        ) : null}
        {formError ? <AppText variant="caption" color={theme.colors.error}>{formError}</AppText> : null}
      </AdminPageSection>

      <ActionRow compact={isCompact}>
        <AppButton
          title={t('admin.previewWholeMenu')}
          variant="secondary"
          onPress={() => navigation.navigate('AdminWholeMenuPreview', { draftSchedules: previewSchedules, initialLanguage: language })}
          style={styles.flexButton}
          disabled={previewSchedules.length === 0}
        />
        <AppButton
          title={editingSchedule ? t('admin.saveChanges') : t('admin.createSchedule')}
          loading={saving}
          disabled={!canSave}
          onPress={() => void save()}
          style={styles.flexButton}
        />
      </ActionRow>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  heading: {
    gap: theme.spacing.sm,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  headingText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  stack: {
    gap: theme.spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  modeChip: {
    minHeight: 38,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
  },
  modeChipActive: {
    borderColor: theme.colors.primary300,
    backgroundColor: theme.colors.secondaryCream,
  },
  disabledChip: {
    opacity: 0.55,
  },
  optionStack: {
    gap: theme.spacing.sm,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  optionCardActive: {
    borderColor: theme.colors.primary300,
    backgroundColor: theme.colors.secondaryCream,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  optionText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  twoCol: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  stackCol: {
    flexDirection: 'column',
  },
  actionPair: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  flexButton: {
    flex: 1,
  },
  warningCard: {
    backgroundColor: theme.colors.primary50,
    borderColor: theme.colors.primary100,
  },
});
