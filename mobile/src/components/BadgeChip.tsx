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
      <AppText variant="caption" style={styles.label} numberOfLines={1}>
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
  },
});

const toneStyles = StyleSheet.create({
  default: {
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
  },
  success: {
    backgroundColor: '#ebf7f0',
    borderColor: '#b7dfc5',
  },
  warning: {
    backgroundColor: '#fdf4e6',
    borderColor: '#e8c68f',
  },
  error: {
    backgroundColor: '#fdecec',
    borderColor: '#e8b2b1',
  },
  info: {
    backgroundColor: '#edf3f7',
    borderColor: '#b7c8d5',
  },
});
