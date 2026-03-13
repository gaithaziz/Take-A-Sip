import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';

type BadgeChipProps = {
  label: string;
  tone?: 'default' | 'success' | 'warning' | 'error' | 'info';
};

export const BadgeChip = ({ label, tone = 'default' }: BadgeChipProps) => {
  return (
    <View style={[styles.chip, toneStyles[tone]]}>
      <AppText variant="caption" style={[styles.label, toneLabelStyles[tone]]} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    minHeight: 26,
    minWidth: 72,
    maxWidth: '100%',
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    justifyContent: 'center',
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

const toneStyles = StyleSheet.create({
  default: {
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
  },
  success: {
    backgroundColor: theme.colors.successSurface,
    borderColor: '#c7dcc9',
  },
  warning: {
    backgroundColor: theme.colors.warningSurface,
    borderColor: '#e7cba1',
  },
  error: {
    backgroundColor: theme.colors.errorSurface,
    borderColor: '#e4b0a8',
  },
  info: {
    backgroundColor: theme.colors.infoSurface,
    borderColor: '#c0ced7',
  },
});

const toneLabelStyles = StyleSheet.create({
  default: { color: theme.colors.primary700 },
  success: { color: theme.colors.success },
  warning: { color: theme.colors.warning },
  error: { color: theme.colors.error },
  info: { color: theme.colors.info },
});
