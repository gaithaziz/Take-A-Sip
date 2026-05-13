import { PropsWithChildren, useEffect, useRef } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/theme';

type AppShellProps = PropsWithChildren<{
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  includeTopInset?: boolean;
  resetScrollKey?: string | number;
}>;

export const AppShell = ({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  includeTopInset = true,
  resetScrollKey,
}: AppShellProps) => {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const topPadding = (includeTopInset ? insets.top : 0) + theme.spacing.lg;

  useEffect(() => {
    if (scroll) {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [resetScrollKey, scroll]);

  if (!scroll) {
    return (
      <View style={[styles.container, { paddingTop: topPadding, paddingBottom: insets.bottom + theme.spacing.lg }]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: topPadding,
          paddingBottom: insets.bottom + theme.spacing.xl,
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
    gap: theme.spacing.xxl,
  },
});
