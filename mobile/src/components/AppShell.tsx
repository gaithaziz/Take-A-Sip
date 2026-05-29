import { PropsWithChildren, useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}>
        <View style={[styles.container, { paddingTop: topPadding, paddingBottom: insets.bottom + theme.spacing.lg }]}>
        {children}
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}>
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: topPadding,
            paddingBottom: insets.bottom + theme.spacing.xxl * 2,
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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.xxl,
  },
});
