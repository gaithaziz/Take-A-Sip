import { StyleSheet, View } from 'react-native';

import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { mirroredRow } from '@/utils/layout';

import { AppText } from '../AppText';

type InfoLineProps = {
  label: string;
  value: string;
  numberOfLines?: number;
};

export const InfoLine = ({ label, value, numberOfLines = 1 }: InfoLineProps) => {
  const { isRTL } = useLanguage();
  return (
    <View style={[styles.row, mirroredRow(isRTL)]}>
      <AppText variant="bodySmall" color={theme.colors.textSecondary}>
        {`${label}:`}
      </AppText>
      <AppText variant="bodySmall" color={theme.colors.textSecondary} numberOfLines={numberOfLines} style={styles.value}>
        {value}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  value: {
    flex: 1,
  },
});
