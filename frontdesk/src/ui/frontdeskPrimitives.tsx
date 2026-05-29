import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import { frontdeskTextAlign, frontdeskTheme } from '@/ui/frontdeskTheme';

type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
};

export const FrontdeskCard = ({ children, style, elevated = true }: CardProps) => (
  <View style={[styles.card, !elevated ? styles.cardFlat : null, style]}>{children}</View>
);

type SectionHeaderProps = {
  title: string;
  isRTL?: boolean;
  style?: StyleProp<TextStyle>;
};

export const SectionHeader = ({ title, isRTL = false, style }: SectionHeaderProps) => (
  <Text allowFontScaling={false} style={[styles.sectionHeader, isRTL ? frontdeskTextAlign.rtl : frontdeskTextAlign.ltr, style]}>
    {title}
  </Text>
);

type CompositeTextRun = {
  text: string;
  direction?: 'ltr' | 'rtl';
  style?: StyleProp<TextStyle>;
};

type FrontdeskCompositeTextProps = {
  runs: CompositeTextRun[];
  isRTL?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

const inferTextDirection = (value: string): 'ltr' | 'rtl' => (/[\u0600-\u06FF]/.test(value) ? 'rtl' : 'ltr');

const resolveDirectionStyle = (direction: CompositeTextRun['direction'], isRTL: boolean) => {
  if (direction === 'rtl') {
    return frontdeskTextAlign.rtl;
  }
  if (direction === 'ltr') {
    return frontdeskTextAlign.ltr;
  }
  return isRTL ? frontdeskTextAlign.rtl : frontdeskTextAlign.ltr;
};

export const FrontdeskCompositeText = ({
  runs,
  isRTL = false,
  style,
  numberOfLines,
}: FrontdeskCompositeTextProps) => (
  <Text
    allowFontScaling={false}
    style={[isRTL ? frontdeskTextAlign.rtl : frontdeskTextAlign.ltr, style]}
    numberOfLines={numberOfLines}
  >
    {runs.map((run, index) => (
      <Text key={`${index}-${run.text}`} style={[resolveDirectionStyle(run.direction, isRTL), run.style]}>
        {run.text}
      </Text>
    ))}
  </Text>
);

type FrontdeskLabelValueTextProps = {
  label: string;
  value: string;
  isRTL?: boolean;
  style?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
  valueStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
  valueDirection?: 'ltr' | 'rtl' | 'auto';
};

export const FrontdeskLabelValueText = ({
  label,
  value,
  isRTL = false,
  style,
  labelStyle,
  valueStyle,
  numberOfLines,
  valueDirection = 'auto',
}: FrontdeskLabelValueTextProps) => (
  <FrontdeskCompositeText
    isRTL={isRTL}
    style={style}
    numberOfLines={numberOfLines}
    runs={[
      { text: `${label}: `, direction: isRTL ? 'rtl' : 'ltr', style: labelStyle },
      {
        text: value,
        direction: valueDirection === 'auto' ? inferTextDirection(value) : valueDirection,
        style: valueStyle,
      },
    ]}
  />
);

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

type FrontdeskButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  isRTL?: boolean;
};

export const FrontdeskButton = ({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
  minHeight = frontdeskTheme.touch.medium,
  style,
  textStyle,
  accessibilityLabel,
  isRTL = false,
}: FrontdeskButtonProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel ?? label}
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [
      styles.button,
      styles[`${variant}Button`],
      { minHeight, opacity: disabled ? 0.6 : 1 },
      pressed && !disabled ? styles.buttonPressed : null,
      pressed && !disabled ? styles[`${variant}ButtonPressed`] : null,
      style,
    ]}
  >
    <Text
      allowFontScaling={false}
      numberOfLines={1}
      style={[styles.buttonText, styles[`${variant}ButtonText`], isRTL ? frontdeskTextAlign.rtl : frontdeskTextAlign.ltr, textStyle]}
    >
      {label}
    </Text>
  </Pressable>
);

type StatusVariant = 'new' | 'accepted' | 'cancelled' | 'neutral';

type StatusChipProps = {
  text: string;
  variant?: StatusVariant;
  isRTL?: boolean;
};

export const StatusChip = ({ text, variant = 'neutral', isRTL = false }: StatusChipProps) => (
  <View style={[styles.statusChip, styles[`${variant}StatusChip`]]}>
    <Text allowFontScaling={false} style={[styles.statusChipText, isRTL ? frontdeskTextAlign.rtl : frontdeskTextAlign.ltr]}>
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: frontdeskTheme.colors.surface,
    borderRadius: frontdeskTheme.radius.xl,
    borderWidth: 1,
    borderColor: frontdeskTheme.colors.borderSoft,
    padding: frontdeskTheme.spacing.lg,
    ...frontdeskTheme.elevation.card,
  },
  cardFlat: {
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sectionHeader: {
    ...frontdeskTheme.typography.section,
    color: frontdeskTheme.colors.textPrimary,
    marginBottom: frontdeskTheme.spacing.sm,
    letterSpacing: 0.2,
  },
  button: {
    borderRadius: frontdeskTheme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: frontdeskTheme.spacing.md,
    paddingVertical: 2,
  },
  buttonPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.985 }],
  },
  primaryButton: {
    backgroundColor: frontdeskTheme.colors.primary,
  },
  primaryButtonPressed: {
    backgroundColor: frontdeskTheme.colors.primaryPressed,
  },
  secondaryButton: {
    backgroundColor: '#F6EFE5',
    borderWidth: 1,
    borderColor: frontdeskTheme.colors.border,
  },
  secondaryButtonPressed: {
    backgroundColor: '#EFE4D6',
  },
  dangerButton: {
    backgroundColor: frontdeskTheme.colors.dangerBg,
    borderWidth: 1,
    borderColor: frontdeskTheme.colors.dangerBorder,
  },
  dangerButtonPressed: {
    backgroundColor: '#FCE4E1',
  },
  ghostButton: {
    backgroundColor: frontdeskTheme.colors.surface,
    borderWidth: 1,
    borderColor: frontdeskTheme.colors.primary,
  },
  ghostButtonPressed: {
    backgroundColor: '#F7EEE2',
  },
  buttonText: {
    ...frontdeskTheme.typography.button,
    textAlign: 'center',
  },
  primaryButtonText: {
    color: frontdeskTheme.colors.onPrimary,
  },
  secondaryButtonText: {
    color: '#4C3A28',
  },
  dangerButtonText: {
    color: frontdeskTheme.colors.dangerText,
  },
  ghostButtonText: {
    color: frontdeskTheme.colors.primary,
  },
  statusChip: {
    borderRadius: frontdeskTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    maxWidth: 170,
  },
  newStatusChip: {
    backgroundColor: frontdeskTheme.colors.statusNewBg,
    borderColor: frontdeskTheme.colors.statusNewBorder,
  },
  acceptedStatusChip: {
    backgroundColor: frontdeskTheme.colors.statusAcceptedBg,
    borderColor: frontdeskTheme.colors.statusAcceptedBorder,
  },
  cancelledStatusChip: {
    backgroundColor: frontdeskTheme.colors.statusCancelledBg,
    borderColor: frontdeskTheme.colors.statusCancelledBorder,
  },
  neutralStatusChip: {
    backgroundColor: frontdeskTheme.colors.statusNeutralBg,
    borderColor: frontdeskTheme.colors.statusNeutralBorder,
  },
  statusChipText: {
    ...frontdeskTheme.typography.caption,
    color: '#4A3A25',
    letterSpacing: 0.15,
  },
});
