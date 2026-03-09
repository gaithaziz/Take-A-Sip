import { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { mirroredRow } from '@/utils/layout';

type ActionRowProps = PropsWithChildren<{
  compact?: boolean;
  style?: ViewStyle;
}>;

export const ActionRow = ({ compact, style, children }: ActionRowProps) => {
  const { isRTL } = useLanguage();
  return (
    <View style={[styles.base, mirroredRow(isRTL), compact ? styles.compact : null, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  compact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
});
