import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';

type LoadingStateProps = {
  label?: string;
};

export const LoadingState = ({ label }: LoadingStateProps) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary500} />
      {label ? (
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          {label}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: theme.spacing.xxxl,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
});
