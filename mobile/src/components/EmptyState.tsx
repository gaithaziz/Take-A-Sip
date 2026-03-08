import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppButton } from './AppButton';
import { AppCard } from './AppCard';
import { AppText } from './AppText';

type EmptyStateProps = {
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
};

export const EmptyState = ({ title, subtitle, actionLabel, onAction }: EmptyStateProps) => {
  return (
    <AppCard>
      <View style={styles.center}>
        <AppText variant="h3">{title}</AppText>
        <AppText variant="bodySmall" color={theme.colors.textSecondary} align="center">
          {subtitle}
        </AppText>
        {actionLabel && onAction ? <AppButton title={actionLabel} onPress={onAction} /> : null}
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  center: {
    gap: theme.spacing.md,
    alignItems: 'center',
  },
});
