import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';
import { AppCard } from './AppCard';

type LoadingStateProps = {
  label?: string;
};

export const LoadingState = ({ label }: LoadingStateProps) => {
  return (
    <View style={styles.container}>
      <AppCard style={styles.card}>
        <View style={styles.indicatorWrap}>
          <ActivityIndicator size="large" color={theme.colors.primary500} />
        </View>
        {label ? (
          <AppText variant="bodySmall" color={theme.colors.textSecondary} align="center">
            {label}
          </AppText>
        ) : null}
      </AppCard>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
    minHeight: 132,
    justifyContent: 'center',
  },
  indicatorWrap: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
});
