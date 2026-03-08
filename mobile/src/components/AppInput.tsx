import { ForwardedRef, forwardRef } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';

import { AppText } from './AppText';

type AppInputProps = TextInputProps & {
  label?: string;
  error?: string;
};

const Input = ({ label, error, style, ...rest }: AppInputProps, ref: ForwardedRef<TextInput>) => {
  const { isRTL } = useLanguage();
  return (
    <View style={styles.wrapper}>
      {label ? (
        <AppText variant="bodySmall" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={theme.colors.textMuted}
        style={[
          styles.input,
          { writingDirection: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' },
          error ? styles.errorBorder : null,
          style,
        ]}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" color={theme.colors.error} style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
};

export const AppInput = forwardRef(Input);

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.sm,
  },
  label: {
    color: theme.colors.textSecondary,
  },
  input: {
    minHeight: 52,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  errorBorder: {
    borderColor: theme.colors.error,
  },
  error: {
    marginTop: theme.spacing.xs,
  },
});
