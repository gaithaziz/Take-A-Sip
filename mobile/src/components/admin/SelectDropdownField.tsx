import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { mirroredRow } from '@/utils/layout';

import { AppText } from '../AppText';

type SelectOption = {
  value: string;
  label: string;
};

type SelectDropdownFieldProps = {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (nextValue: string) => void;
  emptyLabel?: string;
};

export const SelectDropdownField = ({
  label,
  value,
  options,
  onChange,
  emptyLabel,
}: SelectDropdownFieldProps) => {
  const { t } = useAppTranslation();
  const { isRTL } = useLanguage();
  const [open, setOpen] = useState(false);

  const selectedLabel = useMemo(
    () => options.find((option) => option.value === value)?.label ?? '',
    [options, value],
  );

  const hasOptions = options.length > 0;

  return (
    <View style={styles.wrapper}>
      <AppText variant="bodySmall" color={theme.colors.textSecondary}>
        {label}
      </AppText>
      <Pressable
        style={[styles.trigger, !hasOptions ? styles.triggerDisabled : null]}
        onPress={() => {
          if (!hasOptions) return;
          setOpen(true);
        }}>
        <AppText variant="bodySmall" numberOfLines={1} color={selectedLabel ? theme.colors.textPrimary : theme.colors.textMuted}>
          {selectedLabel || emptyLabel || '-'}
        </AppText>
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <AppText variant="h3" numberOfLines={2}>
              {label}
            </AppText>

            <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
              {options.map((option) => {
                const selected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    style={[styles.option, selected ? styles.optionSelected : null]}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}>
                    <AppText
                      variant="bodySmall"
                      numberOfLines={2}
                      color={selected ? theme.colors.primary700 : theme.colors.textPrimary}>
                      {option.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={[styles.footer, mirroredRow(isRTL)]}>
              <Pressable onPress={() => setOpen(false)} style={styles.footerBtn}>
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  {t('common.cancel')}
                </AppText>
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
  },
  trigger: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  triggerDisabled: {
    opacity: 0.55,
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
    maxHeight: '75%',
  },
  optionsScroll: {
    marginTop: theme.spacing.md,
  },
  option: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.xs,
  },
  optionSelected: {
    backgroundColor: theme.colors.secondaryCream,
  },
  footer: {
    marginTop: theme.spacing.sm,
    justifyContent: 'flex-end',
  },
  footerBtn: {
    paddingVertical: theme.spacing.xs,
    minWidth: 72,
  },
});
