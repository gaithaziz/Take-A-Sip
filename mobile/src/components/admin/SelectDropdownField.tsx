import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

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
  searchable?: boolean;
  searchPlaceholder?: string;
  noMatchesLabel?: string;
};

export const SelectDropdownField = ({
  label,
  value,
  options,
  onChange,
  emptyLabel,
  searchable = false,
  searchPlaceholder,
  noMatchesLabel,
}: SelectDropdownFieldProps) => {
  const { t } = useAppTranslation();
  const { isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedLabel = useMemo(
    () => options.find((option) => option.value === value)?.label ?? '',
    [options, value],
  );

  const hasOptions = options.length > 0;
  const filteredOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [options, searchQuery]);

  return (
    <View style={styles.wrapper}>
      <AppText variant="bodySmall" color={theme.colors.textSecondary}>
        {label}
      </AppText>
      <Pressable
        style={[styles.trigger, !hasOptions ? styles.triggerDisabled : null]}
        onPress={() => {
          if (!hasOptions) return;
          setSearchQuery('');
          setOpen(true);
        }}>
        <View style={[styles.triggerRow, mirroredRow(isRTL)]}>
          <AppText variant="bodySmall" numberOfLines={2} color={selectedLabel ? theme.colors.textPrimary : theme.colors.textMuted} style={styles.triggerText}>
            {selectedLabel || emptyLabel || '-'}
          </AppText>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            v
          </AppText>
        </View>
      </Pressable>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <AppText variant="h3" numberOfLines={2}>
              {label}
            </AppText>

            {searchable ? (
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={searchPlaceholder ?? t('admin.searchMenuPlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.searchInput, isRTL ? styles.textRTL : null]}
                autoCapitalize="none"
                autoCorrect={false}
              />
            ) : null}

            <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
              {filteredOptions.length === 0 ? (
                <View style={styles.emptyOption}>
                  <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                    {noMatchesLabel ?? emptyLabel ?? '-'}
                  </AppText>
                </View>
              ) : null}
              {filteredOptions.map((option) => {
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
    minHeight: 54,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  triggerText: {
    flex: 1,
  },
  triggerDisabled: {
    opacity: 0.55,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  modalCard: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.floating,
  },
  optionsScroll: {
    marginTop: theme.spacing.md,
  },
  searchInput: {
    marginTop: theme.spacing.md,
    minHeight: 46,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
  textRTL: {
    textAlign: 'right',
  },
  option: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionSelected: {
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
  },
  emptyOption: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  footer: {
    marginTop: theme.spacing.sm,
    justifyContent: 'flex-end',
  },
  footerBtn: {
    paddingVertical: theme.spacing.sm,
    minWidth: 72,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
});
