import { Pressable, StyleSheet, View } from 'react-native';

import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { mirroredRow } from '@/utils/layout';

import { AppText } from '../AppText';

type InfoLineProps = {
  label: string;
  value: string;
  numberOfLines?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export const InfoLine = ({ label, value, numberOfLines = 1, onPress, accessibilityLabel }: InfoLineProps) => {
  const { isRTL } = useLanguage();
  const content = (
    <>
      <AppText variant="bodySmall" color={theme.colors.textSecondary}>
        {`${label}:`}
      </AppText>
      <AppText
        variant="bodySmall"
        color={onPress ? theme.colors.primary700 : theme.colors.textSecondary}
        numberOfLines={numberOfLines}
        style={[styles.value, onPress ? styles.linkValue : null]}>
        {value}
      </AppText>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
        hitSlop={6}
        onPress={onPress}
        style={({ pressed }) => [styles.row, mirroredRow(isRTL), pressed ? styles.pressed : null]}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.row, mirroredRow(isRTL)]}>
      {content}
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
  linkValue: {
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.72,
  },
});
