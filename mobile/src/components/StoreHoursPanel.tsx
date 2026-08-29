import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { theme } from '@/theme';
import { LanguageCode, StoreStatus } from '@/types/api';
import { formatStoreDateTime, formatWorkingHoursDay, getWorkingDayLabel, todayWorkingHours } from '@/utils/storeHours';
import { mirroredRow } from '@/utils/layout';

import { AppButton } from './AppButton';
import { AppCard } from './AppCard';
import { AppText } from './AppText';

type Props = {
  status: StoreStatus;
  language: LanguageCode;
  isRTL: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
};

export const StoreHoursPanel = ({ status, language, isRTL, t }: Props) => {
  const [visible, setVisible] = useState(false);
  const today = todayWorkingHours(status);
  const statusLabel = status.accepting_orders ? t('storeHours.openNow') : t('storeHours.closedNow');
  const todayLabel = today ? formatWorkingHoursDay(today, language, t) : t('storeHours.hoursNotConfigured');

  return (
    <>
      <Pressable onPress={() => setVisible(true)} accessibilityRole="button" accessibilityLabel={t('storeHours.viewHours')}>
        <AppCard style={[styles.statusCard, !status.accepting_orders ? styles.closedCard : null]}>
          <View style={[styles.statusRow, mirroredRow(isRTL)]}>
            <View style={styles.statusCopy}>
              <AppText variant="h3" color={status.accepting_orders ? theme.colors.success : theme.colors.warning}>
                {statusLabel}
              </AppText>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>{todayLabel}</AppText>
              {!status.accepting_orders && status.next_open_at ? (
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  {t('storeHours.nextOpen', { value: formatStoreDateTime(status.next_open_at, language, status.timezone) })}
                </AppText>
              ) : null}
            </View>
            <Ionicons name="time-outline" size={24} color={theme.colors.primary700} />
          </View>
        </AppCard>
      </Pressable>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <AppText variant="h2">{t('storeHours.title')}</AppText>
            <ScrollView contentContainerStyle={styles.days}>
              {[...(status.working_hours ?? [])].sort((a, b) => a.day_of_week - b.day_of_week).map((entry) => (
                <View key={entry.day_of_week} style={[styles.dayRow, mirroredRow(isRTL)]}>
                  <AppText variant="bodySmall">{getWorkingDayLabel(entry.day_of_week, t)}</AppText>
                  <AppText variant="bodySmall" color={entry.is_open ? theme.colors.textPrimary : theme.colors.textSecondary}>
                    {formatWorkingHoursDay(entry, language, t)}
                  </AppText>
                </View>
              ))}
              {!status.working_hours ? <AppText>{t('storeHours.hoursNotConfigured')}</AppText> : null}
            </ScrollView>
            <AppButton title={t('common.ok')} onPress={() => setVisible(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  statusCard: { padding: theme.spacing.md, borderColor: theme.colors.primary200 },
  closedCard: { backgroundColor: theme.colors.warningSurface },
  statusRow: { alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.md },
  statusCopy: { flex: 1, minWidth: 0, gap: theme.spacing.xs },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '82%', backgroundColor: theme.colors.surface, padding: theme.spacing.xl, gap: theme.spacing.lg },
  days: { gap: theme.spacing.sm },
  dayRow: { justifyContent: 'space-between', gap: theme.spacing.md, paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
});
