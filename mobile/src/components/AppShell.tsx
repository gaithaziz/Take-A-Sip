import { PropsWithChildren } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';

type AppShellProps = PropsWithChildren<{
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}>;

export const AppShell = ({ children, scroll = true, refreshing, onRefresh }: AppShellProps) => {
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();

  if (!scroll) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + theme.spacing.md, direction: isRTL ? 'rtl' : 'ltr' }]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: insets.top + theme.spacing.md,
          paddingBottom: insets.bottom + theme.spacing.xl,
          direction: isRTL ? 'rtl' : 'ltr',
        },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={theme.colors.primary500} />
        ) : undefined
      }>
      {children}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
});
