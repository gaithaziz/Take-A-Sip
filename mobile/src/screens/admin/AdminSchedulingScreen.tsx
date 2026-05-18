import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { DateTimeField } from '@/components/DateTimeField';
import { EmptyState } from '@/components/EmptyState';
import { ActionRow } from '@/components/admin/ActionRow';
import { AdminPageSection } from '@/components/admin/AdminPageSection';
import { ExpandableText } from '@/components/admin/ExpandableText';
import { InfoLine } from '@/components/admin/InfoLine';
import { SelectDropdownField } from '@/components/admin/SelectDropdownField';
import { ListPageSkeleton } from '@/components/skeleton/PageSkeletons';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { adminService } from '@/services/adminService';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { MenuEntityType, MenuSchedule, Section } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { getLocalizedValue } from '@/utils/i18n';
import { mirroredRow } from '@/utils/layout';
import { getStoreTimeZone } from '@/utils/format';

type EntityOption = {
  id: string;
  type: MenuEntityType;
  label: string;
};

type ScheduleForm = {
  entity_type: MenuEntityType;
  entity_id: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  is_active: boolean;
};

const defaultForm: ScheduleForm = {
  entity_type: 'section',
  entity_id: '',
  start_time: '07:00',
  end_time: '11:00',
  days_of_week: [0, 1, 2, 3, 4, 5, 6],
  is_active: true,
};

const buildEntityOptions = (sections: Section[], language: 'en' | 'ar'): EntityOption[] => {
  const options: EntityOption[] = [];
  sections.forEach((section) => {
    const sectionName = getLocalizedValue(section, language, 'name');
    options.push({ id: section.id, type: 'section', label: sectionName });

    section.items.forEach((item) => {
      const itemName = getLocalizedValue(item, language, 'name');
      options.push({ id: item.id, type: 'item', label: `${sectionName} > ${itemName}` });

      item.item_types.forEach((itemType) => {
        const typeName = getLocalizedValue(itemType, language, 'name');
        options.push({ id: itemType.id, type: 'type', label: `${sectionName} > ${itemName} > ${typeName}` });

        itemType.sizes.forEach((size) => {
          const sizeName = getLocalizedValue(size, language, 'name');
          options.push({ id: size.id, type: 'size', label: `${sectionName} > ${itemName} > ${typeName} > ${sizeName}` });

          size.addons.forEach((addon) => {
            const addonName = getLocalizedValue(addon, language, 'name');
            options.push({ id: addon.id, type: 'addon', label: `${sectionName} > ${itemName} > ${typeName} > ${sizeName} > ${addonName}` });
          });
        });
      });
    });
  });
  return options;
};

export const AdminSchedulingScreen = () => {
  const { t, language } = useAppTranslation();
  const { isRTL } = useLanguage();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 390;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<MenuSchedule[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleForm>(defaultForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [mutatingScheduleId, setMutatingScheduleId] = useState<string | null>(null);

  const options = useMemo(() => buildEntityOptions(sections, language), [sections, language]);
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
  const filteredOptions = useMemo(() => options.filter((option) => option.type === form.entity_type), [form.entity_type, options]);
  const entityTypeOptions = useMemo(
    () =>
      (['section', 'item', 'type', 'size', 'addon'] as MenuEntityType[]).map((entityType) => ({
        value: entityType,
        label: t(`admin.${entityType}`),
      })),
    [t],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [scheduleResponse, menu] = await Promise.all([adminService.listSchedules(), adminService.getMenuTree()]);
      setSchedules(scheduleResponse.schedules);
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

  const resetForm = () => {
    setEditingScheduleId(null);
    setFormError(null);
    setForm((prev) => ({
      ...defaultForm,
      entity_type: prev.entity_type,
      entity_id: '',
    }));
  };

  const startEdit = (schedule: MenuSchedule) => {
    setEditingScheduleId(schedule.id);
    setFormError(null);
    setForm({
      entity_type: schedule.entity_type,
      entity_id: schedule.entity_id,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      days_of_week: schedule.days_of_week,
      is_active: schedule.is_active,
    });
  };

  const save = async () => {
    if (!form.entity_id || !form.start_time || !form.end_time || form.days_of_week.length === 0) {
      setFormError(t('validation.requiredFields'));
      return;
    }

    try {
      setSaving(true);
      setFormError(null);
      if (editingScheduleId) {
        await adminService.updateSchedule(editingScheduleId, {
          start_time: form.start_time,
          end_time: form.end_time,
          days_of_week: form.days_of_week,
          is_active: form.is_active,
        });
      } else {
        await adminService.createSchedule({
          entity_type: form.entity_type,
          entity_id: form.entity_id,
          start_time: form.start_time,
          end_time: form.end_time,
          days_of_week: form.days_of_week,
        });
      }

      resetForm();
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    } finally {
      setSaving(false);
    }
  };

  const removeSchedule = async (scheduleId: string) => {
    Alert.alert(t('admin.deleteSchedule'), t('admin.deleteScheduleConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('admin.delete'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              setMutatingScheduleId(scheduleId);
              await adminService.deleteSchedule(scheduleId);
              await load();
            } catch (e) {
              Alert.alert(t('common.error'), getApiErrorMessage(e, t));
            } finally {
              setMutatingScheduleId(null);
            }
          })();
        },
      },
    ]);
  };

  const toggleSchedule = async (schedule: MenuSchedule) => {
    try {
      setMutatingScheduleId(schedule.id);
      await adminService.updateSchedule(schedule.id, { is_active: !schedule.is_active });
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    } finally {
      setMutatingScheduleId(null);
    }
  };

  const labelByEntity = useMemo(() => {
    const index = new Map<string, string>();
    options.forEach((option) => index.set(`${option.type}:${option.id}`, option.label));
    return index;
  }, [options]);

  const toggleDay = (day: number) => {
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

  const timeToDate = (value: string): Date => {
    const [h, m] = value.split(':').map(Number);
    const next = new Date();
    next.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
    return next;
  };

  const dateToTime = (value: Date): string =>
    `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;

  const timezone = getStoreTimeZone();
  const canSave = !saving && Boolean(form.entity_id) && Boolean(form.start_time) && Boolean(form.end_time) && form.days_of_week.length > 0;

  const renderSchedule = ({ item: schedule }: { item: MenuSchedule }) => (
    <AppCard style={styles.itemCard}>
      <View style={[styles.itemHeader, mirroredRow(isRTL)]}>
        <View style={styles.grow}>
          <ExpandableText
            value={labelByEntity.get(`${schedule.entity_type}:${schedule.entity_id}`) ?? `${schedule.entity_type}:${schedule.entity_id}`}
            variant="h3"
            numberOfLines={2}
          />
        </View>
        <BadgeChip label={schedule.is_active ? t('admin.active') : t('admin.inactive')} tone={schedule.is_active ? 'success' : 'default'} />
      </View>
      <View style={styles.infoBox}>
        <InfoLine label={`${t('admin.timeRange')} (${t('admin.storeTimezone')}: ${timezone})`} value={`${schedule.start_time} - ${schedule.end_time}`} />
        <InfoLine
          label={t('admin.daysOfWeek')}
          value={schedule.days_of_week.map((day) => dayLabelByValue[day]).join(', ')}
          numberOfLines={2}
        />
      </View>
      <ActionRow compact={isCompact}>
        <AppButton title={t('admin.edit')} variant="secondary" onPress={() => startEdit(schedule)} style={styles.flexButton} disabled={mutatingScheduleId === schedule.id} />
        <AppButton
          title={schedule.is_active ? t('admin.disable') : t('admin.enable')}
          variant="ghost"
          onPress={() => void toggleSchedule(schedule)}
          fullWidth={false}
          loading={mutatingScheduleId === schedule.id}
          disabled={Boolean(mutatingScheduleId && mutatingScheduleId !== schedule.id)}
        />
      </ActionRow>
      <AppButton
        title={t('admin.delete')}
        variant="destructive"
        onPress={() => void removeSchedule(schedule.id)}
        loading={mutatingScheduleId === schedule.id}
        disabled={Boolean(mutatingScheduleId && mutatingScheduleId !== schedule.id)}
      />
    </AppCard>
  );

  return (
    <FlatList
      data={loading || error ? [] : schedules}
      keyExtractor={(schedule) => schedule.id}
      renderItem={renderSchedule}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <AppText variant="h1">{t('admin.schedulingTitle')}</AppText>

          <AdminPageSection
            title={editingScheduleId ? t('admin.editSchedule') : t('admin.createSchedule')}
            subtitle={t('admin.schedulingWhatWhenDays')}>
            <View style={styles.formStack}>
              <View style={styles.formGroup}>
                <SelectDropdownField
                  label={t('admin.entityType')}
                  value={form.entity_type}
                  options={entityTypeOptions}
                  onChange={(value) => {
                    setFormError(null);
                    setForm((prev) => ({
                      ...prev,
                      entity_type: value as MenuEntityType,
                      entity_id: '',
                    }));
                  }}
                />

                <SelectDropdownField
                  label={t('admin.availableTargets')}
                  value={form.entity_id}
                  options={filteredOptions.map((option) => ({ value: option.id, label: option.label }))}
                  onChange={(value) => {
                    setFormError(null);
                    setForm((prev) => ({ ...prev, entity_id: value }));
                  }}
                  emptyLabel={t('admin.noTargets')}
                  searchable
                  searchPlaceholder={t('admin.targetSearchPlaceholder')}
                  noMatchesLabel={t('admin.noMatchingTargets')}
                />
              </View>

              <View style={styles.formGroup}>
                <View style={[styles.halfRow, mirroredRow(isRTL), isCompact ? styles.halfRowCompact : null]}>
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
                  {`${t('admin.storeTimezone')}: ${timezone}`}
                </AppText>
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  {t('admin.scheduleAvailabilityHint')}
                </AppText>
              </View>

              <View style={styles.formGroup}>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>{t('admin.daysOfWeek')}</AppText>
                <View style={[styles.presetRow, mirroredRow(isRTL)]}>
                  <Pressable style={styles.presetChip} onPress={() => setDayPreset([0, 1, 2, 3, 4, 5, 6])}>
                    <AppText variant="caption">{t('admin.everyDay')}</AppText>
                  </Pressable>
                  <Pressable style={styles.presetChip} onPress={() => setDayPreset([0, 1, 2, 3, 4])}>
                    <AppText variant="caption">{t('admin.weekdays')}</AppText>
                  </Pressable>
                  <Pressable style={styles.presetChip} onPress={() => setDayPreset([5, 6])}>
                    <AppText variant="caption">{t('admin.weekend')}</AppText>
                  </Pressable>
                </View>
                <View style={[styles.optionsWrap, mirroredRow(isRTL)]}>
                  {Object.entries(dayLabelByValue).map(([value, label]) => {
                    const day = Number(value);
                    const selected = form.days_of_week.includes(day);
                    return (
                      <Pressable
                        key={value}
                        style={[styles.optionChip, selected ? styles.optionChipActive : null]}
                        onPress={() => toggleDay(day)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={label}>
                        <AppText variant="caption" color={selected ? theme.colors.primary700 : theme.colors.textSecondary}>{label}</AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {editingScheduleId ? <View style={styles.formGroup}>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>{t('admin.status')}</AppText>
                <View style={[styles.optionsWrap, mirroredRow(isRTL)]}>
                  <Pressable
                    style={[styles.optionChip, form.is_active ? styles.optionChipActive : null]}
                    onPress={() => setForm((prev) => ({ ...prev, is_active: true }))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: form.is_active }}
                    accessibilityLabel={t('admin.active')}>
                    <AppText variant="caption">{t('admin.active')}</AppText>
                  </Pressable>
                  <Pressable
                    style={[styles.optionChip, !form.is_active ? styles.optionChipActive : null]}
                    onPress={() => setForm((prev) => ({ ...prev, is_active: false }))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: !form.is_active }}
                    accessibilityLabel={t('admin.inactive')}>
                    <AppText variant="caption">{t('admin.inactive')}</AppText>
                  </Pressable>
                </View>
              </View> : null}

              {formError ? <AppText variant="caption" color={theme.colors.error}>{formError}</AppText> : null}

              <ActionRow compact={isCompact}>
                <AppButton
                  title={editingScheduleId ? t('admin.saveChanges') : t('admin.createSchedule')}
                  loading={saving}
                  onPress={() => void save()}
                  style={styles.flexButton}
                  disabled={!canSave}
                />
                {editingScheduleId ? <AppButton title={t('common.cancel')} variant="ghost" onPress={resetForm} fullWidth={false} /> : null}
              </ActionRow>
            </View>
          </AdminPageSection>
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <ListPageSkeleton isRTL={isRTL} shell={false} cards={3} />
        ) : error ? (
          <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={load} />
        ) : (
          <EmptyState title={t('admin.noSchedulesTitle')} subtitle={t('admin.noSchedulesSubtitle')} />
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
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  presetChip: {
    borderWidth: 1,
    borderColor: theme.colors.primary200,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    minHeight: 34,
    justifyContent: 'center',
  },
  optionChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    minHeight: 36,
    justifyContent: 'center',
    maxWidth: '48%',
  },
  optionChipActive: {
    borderColor: theme.colors.primary300,
    backgroundColor: theme.colors.secondaryCream,
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
  halfRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  halfRowCompact: {
    flexDirection: 'column',
    gap: theme.spacing.sm,
  },
  grow: {
    flex: 1,
  },
  separator: {
    height: theme.spacing.md,
  },
});
