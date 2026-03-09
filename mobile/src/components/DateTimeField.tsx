import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { mirroredRow } from '@/utils/layout';

import { AppText } from './AppText';

type DateTimeFieldProps = {
  label: string;
  mode: 'date' | 'time';
  value: Date;
  onChange: (next: Date) => void;
};

export const DateTimeField = ({ label, mode, value, onChange }: DateTimeFieldProps) => {
  const { t, language } = useAppTranslation();
  const { isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(value);

  const displayValue = useMemo(() => {
    const locale = language === 'ar' ? 'ar-JO' : 'en-US';
    if (mode === 'date') {
      return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(value);
    }
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(value);
  }, [language, mode, value]);

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type !== 'set' || !selectedDate) {
      return;
    }
    setDraftValue(selectedDate);
  };

  const openPicker = () => {
    setDraftValue(value);
    setOpen(true);
  };

  const confirm = () => {
    onChange(draftValue);
    setOpen(false);
  };

  const iosPickerProps =
    Platform.OS === 'ios'
      ? {
          themeVariant: 'light' as const,
          textColor: theme.colors.textPrimary,
        }
      : {};

  return (
    <View style={styles.wrapper}>
      <AppText variant="bodySmall" style={styles.label}>{label}</AppText>
      <Pressable style={styles.inputLike} onPress={openPicker}>
        <AppText>{displayValue}</AppText>
      </Pressable>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <AppText variant="h3" numberOfLines={2}>
              {label}
            </AppText>
            <View style={styles.pickerWrap}>
              <DateTimePicker
                value={draftValue}
                mode={mode}
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                {...iosPickerProps}
                onChange={handleChange}
              />
            </View>
            <View style={[styles.footer, mirroredRow(isRTL)]}>
              <Pressable onPress={() => setOpen(false)} style={styles.footerBtn}>
                <AppText variant="caption" color={theme.colors.textSecondary}>{t('common.cancel')}</AppText>
              </Pressable>
              <Pressable onPress={confirm} style={styles.footerBtn}>
                <AppText variant="caption" color={theme.colors.primary700}>{t('common.confirm')}</AppText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.sm,
    flex: 1,
    minWidth: 140,
  },
  label: {
    color: theme.colors.textSecondary,
  },
  inputLike: {
    minHeight: 52,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: 'center',
  },
  pickerWrap: {
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  modalCard: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
  },
  footer: {
    marginTop: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing.md,
  },
  footerBtn: {
    minWidth: 72,
    paddingVertical: theme.spacing.xs,
  },
});
