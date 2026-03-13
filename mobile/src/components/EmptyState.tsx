import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
    <AppCard style={styles.card}>
      <View style={styles.center}>
        <View style={styles.iconWrap}>
          <Ionicons name="cafe-outline" size={20} color={theme.colors.primary700} />
        </View>
        <AppText variant="h3" align="center">
          {title}
        </AppText>
        <AppText variant="bodySmall" color={theme.colors.textSecondary} align="center">
          {subtitle}
        </AppText>
        {actionLabel && onAction ? <AppButton title={actionLabel} onPress={onAction} style={styles.actionButton} /> : null}
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  center: {
    minHeight: 180,
    gap: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary100,
    backgroundColor: theme.colors.primary50,
  },
  actionButton: {
    minWidth: 140,
  },
});
