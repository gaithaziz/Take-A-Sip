import { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { theme } from '@/theme';

import { AppCard } from '../AppCard';
import { AppText } from '../AppText';

type AdminPageSectionProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  style?: ViewStyle;
}>;

export const AdminPageSection = ({ title, subtitle, style, children }: AdminPageSectionProps) => {
  return (
    <AppCard style={style}>
      <View style={styles.header}>
        <AppText variant="h3" numberOfLines={2}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="bodySmall" color={theme.colors.textSecondary} numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={styles.body}>{children}</View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  header: {
    gap: theme.spacing.xs,
  },
  body: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
});
