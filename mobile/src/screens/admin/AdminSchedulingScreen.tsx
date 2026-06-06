import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { EmptyState } from '@/components/EmptyState';
import { ActionRow } from '@/components/admin/ActionRow';
import { ExpandableText } from '@/components/admin/ExpandableText';
import { InfoLine } from '@/components/admin/InfoLine';
import { ListPageSkeleton } from '@/components/skeleton/PageSkeletons';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { RootStackParamList } from '@/navigation/types';
import { adminService } from '@/services/adminService';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { MenuEntityType, MenuSchedule } from '@/types/api';
import { buildAdminTargetOptions, targetKey } from '@/utils/adminMenuPreview';
import { getApiErrorMessage } from '@/utils/errors';
import { getStoreTimeZone } from '@/utils/format';
import { mirroredRow } from '@/utils/layout';

type AdminSchedulingNavigation = NativeStackNavigationProp<RootStackParamList>;
type ScheduleFilter = 'all' | 'active' | 'inactive';

const entityTypes: Array<MenuEntityType | 'all'> = ['all', 'section', 'item', 'type', 'size', 'addon'];

export const AdminSchedulingScreen = () => {
  const { t, language } = useAppTranslation();
  const { isRTL } = useLanguage();
  const navigation = useNavigation<AdminSchedulingNavigation>();
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const [loading, setLoading] = useState(true);
  const [labelsLoading, setLabelsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<MenuSchedule[]>([]);
  const [labelByEntity, setLabelByEntity] = useState<Map<string, string>>(new Map());
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ScheduleFilter>('all');
  const [typeFilter, setTypeFilter] = useState<MenuEntityType | 'all'>('all');
  const [dayFilter, setDayFilter] = useState<number | 'all'>('all');
  const [mutatingScheduleId, setMutatingScheduleId] = useState<string | null>(null);
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

  const loadLabels = useCallback(async () => {
    try {
      setLabelsLoading(true);
      const menu = await adminService.getMenuTree();
      const labels = new Map<string, string>();
      buildAdminTargetOptions(menu.sections, language).forEach((option) => {
        labels.set(targetKey(option), option.label);
      });
      setLabelByEntity(labels);
    } catch {
      setLabelByEntity(new Map());
    } finally {
      setLabelsLoading(false);
    }
  }, [language]);

  const load = useCallback(
    async (asRefresh = false) => {
      try {
        asRefresh ? setRefreshing(true) : setLoading(true);
        setError(null);
        const scheduleResponse = await adminService.listSchedules();
        setSchedules(scheduleResponse.schedules);
        void loadLabels();
      } catch (e) {
        setError(getApiErrorMessage(e, t));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadLabels, t],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const filteredSchedules = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return schedules.filter((schedule) => {
      if (statusFilter === 'active' && !schedule.is_active) return false;
      if (statusFilter === 'inactive' && schedule.is_active) return false;
      if (typeFilter !== 'all' && schedule.entity_type !== typeFilter) return false;
      if (dayFilter !== 'all' && !schedule.days_of_week.includes(dayFilter)) return false;
      if (!normalized) return true;
      const label = labelByEntity.get(targetKey(schedule)) ?? t('admin.deletedMenuTarget');
      return label.toLowerCase().includes(normalized);
    });
  }, [dayFilter, labelByEntity, query, schedules, statusFilter, typeFilter]);

  const toggleSchedule = async (schedule: MenuSchedule) => {
    try {
      setMutatingScheduleId(schedule.id);
      await adminService.updateSchedule(schedule.id, { is_active: !schedule.is_active });
      await load(true);
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    } finally {
      setMutatingScheduleId(null);
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
              await load(true);
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

  const statusOptions: Array<{ value: ScheduleFilter; label: string }> = [
    { value: 'all', label: t('admin.allSchedules') },
    { value: 'active', label: t('admin.active') },
    { value: 'inactive', label: t('admin.inactive') },
  ];

  if (loading && schedules.length === 0) return <ListPageSkeleton isRTL={isRTL} showFilters cards={4} />;
  if (error && schedules.length === 0) return <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={() => void load()} />;

  return (
    <AppShell refreshing={refreshing} onRefresh={() => void load(true)}>
      <View style={styles.heading}>
        <View style={[styles.titleRow, mirroredRow(isRTL)]}>
          <View style={styles.titleText}>
            <AppText variant="h1" align={isRTL ? 'right' : 'left'}>{t('admin.schedulingTitle')}</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary} align={isRTL ? 'right' : 'left'}>
              {t('admin.schedulingBrowseSubtitle')}
            </AppText>
          </View>
          <AppButton
            title={t('admin.addSchedule')}
            fullWidth={false}
            onPress={() => navigation.navigate('AdminScheduleEditor')}
            style={styles.addButton}
          />
        </View>
        <AppButton
          title={t('admin.previewWholeMenu')}
          variant="secondary"
          onPress={() => navigation.navigate('AdminWholeMenuPreview', { initialLanguage: language })}
        />
      </View>

      <View style={styles.controls}>
        <AppInput
          label={t('admin.searchSchedules')}
          value={query}
          onChangeText={setQuery}
          placeholder={labelsLoading ? t('admin.loadingMenuLabels') : t('admin.searchSchedulesPlaceholder')}
        />

        <View style={[styles.filterRow, mirroredRow(isRTL)]}>
          {statusOptions.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.filterChip, statusFilter === option.value ? styles.filterChipActive : null]}
              onPress={() => setStatusFilter(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: statusFilter === option.value }}
              accessibilityLabel={option.label}>
              <AppText variant="caption" color={statusFilter === option.value ? theme.colors.primary700 : theme.colors.textSecondary}>
                {option.label}
              </AppText>
            </Pressable>
          ))}
        </View>

        <View style={[styles.filterRow, mirroredRow(isRTL)]}>
          {entityTypes.map((entityType) => (
            <Pressable
              key={entityType}
              style={[styles.filterChip, typeFilter === entityType ? styles.filterChipActive : null]}
              onPress={() => setTypeFilter(entityType)}
              accessibilityRole="button"
              accessibilityState={{ selected: typeFilter === entityType }}
              accessibilityLabel={entityType === 'all' ? t('admin.allTargets') : t(`admin.${entityType}`)}>
              <AppText variant="caption" color={typeFilter === entityType ? theme.colors.primary700 : theme.colors.textSecondary}>
                {entityType === 'all' ? t('admin.allTargets') : t(`admin.${entityType}`)}
              </AppText>
            </Pressable>
          ))}
        </View>

        <View style={[styles.filterRow, mirroredRow(isRTL)]}>
          <Pressable
            style={[styles.filterChip, dayFilter === 'all' ? styles.filterChipActive : null]}
            onPress={() => setDayFilter('all')}
            accessibilityRole="button"
            accessibilityState={{ selected: dayFilter === 'all' }}
            accessibilityLabel={t('admin.allDays')}>
            <AppText variant="caption" color={dayFilter === 'all' ? theme.colors.primary700 : theme.colors.textSecondary}>
              {t('admin.allDays')}
            </AppText>
          </Pressable>
          {Object.entries(dayLabelByValue).map(([value, label]) => {
            const day = Number(value);
            return (
              <Pressable
                key={value}
                style={[styles.filterChip, dayFilter === day ? styles.filterChipActive : null]}
                onPress={() => setDayFilter(day)}
                accessibilityRole="button"
                accessibilityState={{ selected: dayFilter === day }}
                accessibilityLabel={label}>
                <AppText variant="caption" color={dayFilter === day ? theme.colors.primary700 : theme.colors.textSecondary}>
                  {label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {filteredSchedules.length === 0 ? (
        <EmptyState title={t('admin.noSchedulesTitle')} subtitle={t('admin.noSchedulesSubtitle')} />
      ) : (
        <View style={styles.stack}>
          {filteredSchedules.map((schedule) => {
            const label = labelByEntity.get(targetKey(schedule)) ?? t('admin.deletedMenuTarget');
            return (
              <AppCard key={schedule.id} style={styles.card}>
                <View style={[styles.cardHeader, mirroredRow(isRTL)]}>
                  <View style={styles.cardTitle}>
                    <ExpandableText value={label} variant="h3" numberOfLines={2} />
                  </View>
                  <View style={styles.badges}>
                    <BadgeChip label={schedule.is_active ? t('admin.active') : t('admin.inactive')} tone={schedule.is_active ? 'success' : 'default'} />
                    <BadgeChip label={t(`admin.${schedule.entity_type}`)} tone="info" />
                  </View>
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
                  <AppButton
                    title={t('admin.edit')}
                    variant="secondary"
                    onPress={() => navigation.navigate('AdminScheduleEditor', { schedule })}
                    style={styles.flexButton}
                    disabled={mutatingScheduleId === schedule.id}
                  />
                  <AppButton
                    title={schedule.is_active ? t('admin.disable') : t('admin.enable')}
                    variant="ghost"
                    fullWidth={false}
                    loading={mutatingScheduleId === schedule.id}
                    disabled={Boolean(mutatingScheduleId && mutatingScheduleId !== schedule.id)}
                    onPress={() => void toggleSchedule(schedule)}
                  />
                  <Pressable
                    style={styles.iconButton}
                    onPress={() => navigation.navigate('AdminWholeMenuPreview', { initialLanguage: language })}
                    accessibilityRole="button"
                    accessibilityLabel={t('admin.previewWholeMenu')}>
                    <Ionicons name="phone-portrait-outline" size={theme.iconSizes.md} color={theme.colors.primary700} />
                  </Pressable>
                  <Pressable
                    style={[styles.iconButton, styles.deleteIconButton]}
                    onPress={() => void removeSchedule(schedule.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t('admin.delete')}>
                    <Ionicons name="trash-outline" size={theme.iconSizes.md} color={theme.colors.error} />
                  </Pressable>
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
  heading: {
    gap: theme.spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  titleText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  addButton: {
    minWidth: 132,
  },
  controls: {
    gap: theme.spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  filterChip: {
    minHeight: 36,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
  },
  filterChipActive: {
    borderColor: theme.colors.primary300,
    backgroundColor: theme.colors.secondaryCream,
  },
  stack: {
    gap: theme.spacing.md,
  },
  card: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  cardTitle: {
    flex: 1,
  },
  badges: {
    gap: theme.spacing.xs,
    alignItems: 'flex-end',
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
  iconButton: {
    width: 54,
    height: 54,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary200,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIconButton: {
    borderColor: '#e7c2bb',
    backgroundColor: theme.colors.errorSurface,
  },
});
