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
  const activityColor =
    variant === 'primary' || variant === 'destructive' ? theme.colors.white : theme.colors.primary700;

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
        pressed ? pressedStyles[variant] : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}>
      {loading ? <ActivityIndicator color={activityColor} /> : <AppText variant="button" style={labelStyles[variant]}>{title}</AppText>}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.55,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: theme.colors.primary500,
    borderColor: theme.colors.primary600,
    ...theme.shadows.floating,
  },
  secondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primary200,
  },
  ghost: {
    backgroundColor: theme.colors.primary50,
    borderColor: theme.colors.primary100,
  },
  destructive: {
    backgroundColor: theme.colors.error,
    borderColor: '#b54b3d',
  },
});

const pressedStyles = StyleSheet.create({
  primary: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  secondary: { backgroundColor: theme.colors.secondarySand },
  ghost: { backgroundColor: theme.colors.secondarySand },
  destructive: { opacity: 0.92, transform: [{ scale: 0.99 }] },
});

const labelStyles = StyleSheet.create({
  primary: { color: theme.colors.white },
  secondary: { color: theme.colors.primary700 },
  ghost: { color: theme.colors.primary700 },
  destructive: { color: theme.colors.white },
});
