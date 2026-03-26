import { ForwardedRef, forwardRef } from 'react';
import { useState } from 'react';
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
  const [isFocused, setIsFocused] = useState(false);
  const { onFocus, onBlur, multiline, ...inputProps } = rest;

  return (
    <View style={styles.wrapper}>
      {label ? (
        <AppText variant="caption" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <TextInput
        ref={ref}
        placeholderTextColor={theme.colors.textMuted}
        selectionColor={theme.colors.primary500}
        accessibilityLabel={rest.accessibilityLabel ?? label}
        style={[
          styles.input,
          multiline ? styles.multiline : null,
          { writingDirection: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' },
          isFocused ? styles.focused : null,
          error ? styles.errorBorder : null,
          style,
        ]}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        multiline={multiline}
        {...inputProps}
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
    letterSpacing: 0.2,
  },
  input: {
    minHeight: 54,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  focused: {
    borderColor: theme.colors.primary300,
    backgroundColor: theme.colors.primary50,
  },
  errorBorder: {
    borderColor: theme.colors.error,
  },
  error: {
    marginTop: theme.spacing.xs,
  },
});
