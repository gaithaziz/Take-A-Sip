import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { DateTimeField } from '@/components/DateTimeField';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ActionRow } from '@/components/admin/ActionRow';
import { AdminPageSection } from '@/components/admin/AdminPageSection';
import { ExpandableText } from '@/components/admin/ExpandableText';
import { InfoLine } from '@/components/admin/InfoLine';
import { SelectDropdownField } from '@/components/admin/SelectDropdownField';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { adminService } from '@/services/adminService';
import { menuService } from '@/services/menuService';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { MenuEntityType, MenuSchedule, Section } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { getLocalizedValue } from '@/utils/i18n';
import { mirroredRow } from '@/utils/layout';

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
    options.push({ id: section.id, type: 'section', label: `${section.name_en} / ${section.name_ar}` });

    section.items.forEach((item) => {
      options.push({ id: item.id, type: 'item', label: getLocalizedValue(item, language, 'name') });

      item.item_types.forEach((itemType) => {
        options.push({ id: itemType.id, type: 'type', label: getLocalizedValue(itemType, language, 'name') });

        itemType.sizes.forEach((size) => {
          options.push({ id: size.id, type: 'size', label: getLocalizedValue(size, language, 'name') });

          size.addons.forEach((addon) => {
            options.push({ id: addon.id, type: 'addon', label: getLocalizedValue(addon, language, 'name') });
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
  const isCompact = width < 390;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<MenuSchedule[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduleForm>(defaultForm);

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
      const [scheduleResponse, menu] = await Promise.all([adminService.listSchedules(), menuService.getMenu()]);
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

  useEffect(() => {
    const firstOption = filteredOptions[0];
    if (!firstOption) return;
    if (!form.entity_id || !filteredOptions.some((option) => option.id === form.entity_id)) {
      setForm((prev) => ({ ...prev, entity_id: firstOption.id }));
    }
  }, [filteredOptions, form.entity_id]);

  const resetForm = () => {
    setEditingScheduleId(null);
    setForm((prev) => ({
      ...defaultForm,
      entity_type: prev.entity_type,
      entity_id: prev.entity_id || filteredOptions[0]?.id || '',
    }));
  };

  const startEdit = (schedule: MenuSchedule) => {
    setEditingScheduleId(schedule.id);
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
      Alert.alert(t('common.error'), t('validation.requiredFields'));
      return;
    }

    try {
      setSaving(true);
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
              await adminService.deleteSchedule(scheduleId);
              await load();
            } catch (e) {
              Alert.alert(t('common.error'), getApiErrorMessage(e, t));
            }
          })();
        },
      },
    ]);
  };

  const toggleSchedule = async (schedule: MenuSchedule) => {
    try {
      await adminService.updateSchedule(schedule.id, { is_active: !schedule.is_active });
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
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

  const timeToDate = (value: string): Date => {
    const [h, m] = value.split(':').map(Number);
    const next = new Date();
    next.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
    return next;
  };

  const dateToTime = (value: Date): string =>
    `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;

  if (loading) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (error) {
    return <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={load} />;
  }

  return (
    <AppShell refreshing={loading} onRefresh={load}>
      <AppText variant="h1">{t('admin.schedulingTitle')}</AppText>

      <AdminPageSection
        title={editingScheduleId ? t('admin.editSchedule') : t('admin.createSchedule')}
        subtitle={t('admin.schedulingWhatWhenDays')}>
        <View style={styles.formStack}>
          <SelectDropdownField
            label={t('admin.entityType')}
            value={form.entity_type}
            options={entityTypeOptions}
            onChange={(value) =>
              setForm((prev) => ({
                ...prev,
                entity_type: value as MenuEntityType,
                entity_id: '',
              }))
            }
          />

          <SelectDropdownField
            label={t('admin.entityId')}
            value={form.entity_id}
            options={filteredOptions.map((option) => ({ value: option.id, label: option.label }))}
            onChange={(value) => setForm((prev) => ({ ...prev, entity_id: value }))}
            emptyLabel={t('admin.noTargets')}
          />

          <View style={[styles.halfRow, mirroredRow(isRTL), isCompact ? styles.halfRowCompact : null]}>
            <DateTimeField
              label={t('admin.startTime')}
              mode="time"
              value={timeToDate(form.start_time)}
              onChange={(value) => setForm((prev) => ({ ...prev, start_time: dateToTime(value) }))}
            />
            <DateTimeField
              label={t('admin.endTime')}
              mode="time"
              value={timeToDate(form.end_time)}
              onChange={(value) => setForm((prev) => ({ ...prev, end_time: dateToTime(value) }))}
            />
          </View>

          <View>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>{t('admin.daysOfWeek')}</AppText>
            <View style={[styles.optionsWrap, mirroredRow(isRTL)]}>
              {Object.entries(dayLabelByValue).map(([value, label]) => {
                const day = Number(value);
                const selected = form.days_of_week.includes(day);
                return (
                  <Pressable key={value} style={[styles.optionChip, selected ? styles.optionChipActive : null]} onPress={() => toggleDay(day)}>
                    <AppText variant="caption" color={selected ? theme.colors.primary700 : theme.colors.textSecondary}>{label}</AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>{t('admin.status')}</AppText>
            <View style={[styles.optionsWrap, mirroredRow(isRTL)]}>
              <Pressable style={[styles.optionChip, form.is_active ? styles.optionChipActive : null]} onPress={() => setForm((prev) => ({ ...prev, is_active: true }))}>
                <AppText variant="caption">{t('admin.active')}</AppText>
              </Pressable>
              <Pressable style={[styles.optionChip, !form.is_active ? styles.optionChipActive : null]} onPress={() => setForm((prev) => ({ ...prev, is_active: false }))}>
                <AppText variant="caption">{t('admin.inactive')}</AppText>
              </Pressable>
            </View>
          </View>

          <ActionRow compact={isCompact}>
            <AppButton title={editingScheduleId ? t('admin.saveChanges') : t('admin.createSchedule')} loading={saving} onPress={() => void save()} style={styles.flexButton} />
            {editingScheduleId ? <AppButton title={t('common.cancel')} variant="ghost" onPress={resetForm} fullWidth={false} /> : null}
          </ActionRow>
        </View>
      </AdminPageSection>

      {schedules.length === 0 ? (
        <EmptyState title={t('admin.noSchedulesTitle')} subtitle={t('admin.noSchedulesSubtitle')} />
      ) : (
        schedules.map((schedule) => (
          <AppCard key={schedule.id}>
            <View style={[styles.itemHeader, mirroredRow(isRTL)]}>
              <Pressable onPress={() => Alert.alert('', labelByEntity.get(`${schedule.entity_type}:${schedule.entity_id}`) ?? `${schedule.entity_type}:${schedule.entity_id}`)} style={styles.grow}>
                <ExpandableText
                  value={labelByEntity.get(`${schedule.entity_type}:${schedule.entity_id}`) ?? `${schedule.entity_type}:${schedule.entity_id}`}
                  variant="h3"
                  numberOfLines={2}
                />
              </Pressable>
              <BadgeChip label={schedule.is_active ? t('admin.active') : t('admin.inactive')} tone={schedule.is_active ? 'success' : 'default'} />
            </View>
            <InfoLine label={t('admin.timeRange')} value={`${schedule.start_time} - ${schedule.end_time}`} />
            <InfoLine
              label={t('admin.daysOfWeek')}
              value={schedule.days_of_week.map((day) => dayLabelByValue[day]).join(', ')}
              numberOfLines={2}
            />
            <ActionRow compact={isCompact}>
              <AppButton title={t('admin.edit')} variant="secondary" onPress={() => startEdit(schedule)} style={styles.flexButton} />
              <AppButton title={schedule.is_active ? t('admin.disable') : t('admin.enable')} variant="ghost" onPress={() => void toggleSchedule(schedule)} fullWidth={false} />
              <AppButton title={t('admin.delete')} variant="destructive" onPress={() => void removeSchedule(schedule.id)} fullWidth={false} />
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
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
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
  flexButton: {
    flex: 1,
  },
  halfRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  halfRowCompact: {
    flexDirection: 'column',
    gap: 0,
  },
  grow: {
    flex: 1,
  },
});
