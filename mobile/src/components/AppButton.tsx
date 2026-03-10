import { ActivityIndicator, AccessibilityState, Insets, Pressable, StyleSheet, ViewStyle } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';

type AppButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  hitSlop?: Insets | number;
  testID?: string;
};

export const AppButton = ({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  fullWidth = true,
  style,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  hitSlop = 6,
  testID,
}: AppButtonProps) => {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      testID={testID}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        fullWidth ? styles.fullWidth : null,
        pressed ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? theme.colors.white : theme.colors.primary600} />
      ) : (
        <AppText variant="body" style={[styles.label, labelStyles[variant]]}>
          {title}
        </AppText>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  fullWidth: {
    width: '100%',
  },
  label: {
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: theme.colors.primary500,
  },
  secondary: {
    backgroundColor: theme.colors.secondaryCream,
    borderWidth: 1,
    borderColor: theme.colors.primary200,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  destructive: {
    backgroundColor: theme.colors.error,
  },
});

const labelStyles = StyleSheet.create({
  primary: { color: theme.colors.white },
  secondary: { color: theme.colors.primary700 },
  ghost: { color: theme.colors.primary700 },
  destructive: { color: theme.colors.white },
});
