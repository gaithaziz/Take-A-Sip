import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Switch, View, useWindowDimensions } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { DateTimeField } from '@/components/DateTimeField';
import { EmptyState } from '@/components/EmptyState';
import { DetailPageSkeleton } from '@/components/skeleton/PageSkeletons';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { RootStackParamList } from '@/navigation/types';
import { adminService } from '@/services/adminService';
import { theme } from '@/theme';
import { WorkingHoursDay } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { mirroredRow } from '@/utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminStoreSettings'>;

const DEFAULT_HOURS: WorkingHoursDay[] = Array.from({ length: 7 }, (_, day) => ({
  day_of_week: day,
  is_open: true,
  opens_at: '09:00',
  closes_at: '23:00',
}));

const timeToDate = (value: string | null | undefined) => {
  const [hours, minutes] = (value ?? '09:00').split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

const dateToTime = (value: Date) =>
  `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;

export const AdminStoreSettingsScreen = ({ navigation }: Props) => {
  const { t, isRTL } = useAppTranslation();
  const { width } = useWindowDimensions();
  const compact = width < 390;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderingEnabled, setOrderingEnabled] = useState(true);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [minimumDelivery, setMinimumDelivery] = useState('0.00');
  const [minimumPickup, setMinimumPickup] = useState('0.00');
  const [hours, setHours] = useState<WorkingHoursDay[]>(DEFAULT_HOURS);

  const dayLabels = useMemo(
    () => [t('admin.dayMon'), t('admin.dayTue'), t('admin.dayWed'), t('admin.dayThu'), t('admin.dayFri'), t('admin.daySat'), t('admin.daySun')],
    [t],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const settings = await adminService.getStoreSettings();
      setOrderingEnabled(settings.ordering_enabled);
      setScheduleEnabled(settings.working_hours !== null && settings.working_hours !== undefined);
      setHours(settings.working_hours?.length === 7 ? [...settings.working_hours].sort((a, b) => a.day_of_week - b.day_of_week) : DEFAULT_HOURS);
      setMinimumDelivery(Number(settings.minimum_delivery_order_amount ?? 0).toFixed(2));
      setMinimumPickup(Number(settings.minimum_pickup_order_amount ?? 0).toFixed(2));
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateDay = (day: number, values: Partial<WorkingHoursDay>) => {
    setHours((current) => current.map((entry) => (entry.day_of_week === day ? { ...entry, ...values } : entry)));
  };

  const save = async () => {
    const parsedDeliveryMinimum = Number(minimumDelivery);
    const parsedPickupMinimum = Number(minimumPickup);
    if (
      !Number.isFinite(parsedDeliveryMinimum)
      || parsedDeliveryMinimum < 0
      || !Number.isFinite(parsedPickupMinimum)
      || parsedPickupMinimum < 0
    ) {
      Alert.alert(t('common.appName'), t('admin.invalidMinimumOrder'));
      return;
    }
    const invalidDay = scheduleEnabled && hours.some((day) => day.is_open && day.opens_at === day.closes_at);
    if (invalidDay) {
      Alert.alert(t('common.appName'), t('admin.invalidTimeRange'));
      return;
    }
    try {
      setSaving(true);
      await adminService.updateStoreSettings({
        ordering_enabled: orderingEnabled,
        minimum_delivery_order_amount: parsedDeliveryMinimum.toFixed(2),
        minimum_pickup_order_amount: parsedPickupMinimum.toFixed(2),
        working_hours: scheduleEnabled ? hours : null,
      });
      Alert.alert(t('common.appName'), t('admin.storeSettingsSaved'));
      await load();
    } catch (e) {
      Alert.alert(t('common.appName'), getApiErrorMessage(e, t));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <DetailPageSkeleton isRTL={isRTL} />;
  if (error) return <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={load} />;

  return (
    <AppShell>
      <View style={[styles.header, mirroredRow(isRTL)]}>
        <AppText variant="h1" style={styles.title}>{t('admin.storeSettingsTitle')}</AppText>
        <AppButton title={t('common.goBack')} variant="ghost" fullWidth={false} onPress={() => navigation.goBack()} />
      </View>

      <AppCard style={styles.card}>
        <View style={[styles.switchRow, mirroredRow(isRTL)]}>
          <View style={styles.flex}>
            <AppText variant="h3">{t('admin.acceptingOrders')}</AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.orderingStatusHelp')}</AppText>
          </View>
          <Switch
            testID="store-ordering-switch"
            accessibilityLabel={t('admin.acceptingOrders')}
            value={orderingEnabled}
            onValueChange={setOrderingEnabled}
          />
        </View>
      </AppCard>

      <AppCard style={styles.card}>
        <AppText variant="h3">{t('admin.minimumDeliveryOrder')}</AppText>
        <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.minimumDeliveryOrderHelp')}</AppText>
        <AppInput
          label={t('admin.amountJod')}
          value={minimumDelivery}
          onChangeText={setMinimumDelivery}
          keyboardType="decimal-pad"
          accessibilityLabel={t('admin.minimumDeliveryOrder')}
        />
      </AppCard>

      <AppCard style={styles.card}>
        <AppText variant="h3">{t('admin.minimumPickupOrder')}</AppText>
        <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.minimumPickupOrderHelp')}</AppText>
        <AppInput
          label={t('admin.amountJod')}
          value={minimumPickup}
          onChangeText={setMinimumPickup}
          keyboardType="decimal-pad"
          accessibilityLabel={t('admin.minimumPickupOrder')}
        />
      </AppCard>

      <AppCard style={styles.card}>
        <View style={[styles.switchRow, mirroredRow(isRTL)]}>
          <View style={styles.flex}>
            <AppText variant="h3">{t('admin.weeklyWorkingHours')}</AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.weeklyWorkingHoursHelp')}</AppText>
          </View>
          <Switch
            testID="store-hours-switch"
            accessibilityLabel={t('admin.weeklyWorkingHours')}
            value={scheduleEnabled}
            onValueChange={setScheduleEnabled}
          />
        </View>

        {scheduleEnabled ? hours.map((day) => (
          <View key={day.day_of_week} style={styles.dayBlock}>
            <View style={[styles.switchRow, mirroredRow(isRTL)]}>
              <AppText variant="h3" style={styles.flex}>{dayLabels[day.day_of_week]}</AppText>
              <AppText variant="caption" color={day.is_open ? theme.colors.success : theme.colors.textMuted}>
                {t(day.is_open ? 'storeHours.open' : 'storeHours.closed')}
              </AppText>
              <Switch
                testID={`store-day-${day.day_of_week}-switch`}
                accessibilityLabel={dayLabels[day.day_of_week]}
                value={day.is_open}
                onValueChange={(is_open) => updateDay(day.day_of_week, { is_open })}
              />
            </View>
            {day.is_open ? (
              <View style={[styles.timeRow, compact ? styles.timeRowCompact : mirroredRow(isRTL)]}>
                <DateTimeField
                  label={t('storeHours.opensAt')}
                  mode="time"
                  value={timeToDate(day.opens_at)}
                  onChange={(value) => updateDay(day.day_of_week, { opens_at: dateToTime(value) })}
                />
                <DateTimeField
                  label={t('storeHours.closesAt')}
                  mode="time"
                  value={timeToDate(day.closes_at)}
                  onChange={(value) => updateDay(day.day_of_week, { closes_at: dateToTime(value) })}
                />
              </View>
            ) : null}
          </View>
        )) : null}
      </AppCard>

      <AppButton title={t('admin.saveStoreSettings')} onPress={() => void save()} loading={saving} />
    </AppShell>
  );
};

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: theme.spacing.md },
  title: { flex: 1 },
  card: { gap: theme.spacing.lg },
  flex: { flex: 1 },
  switchRow: { alignItems: 'center', gap: theme.spacing.md },
  dayBlock: { gap: theme.spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.lg },
  timeRow: { gap: theme.spacing.md, alignItems: 'flex-start' },
  timeRowCompact: { flexDirection: 'column' },
});
