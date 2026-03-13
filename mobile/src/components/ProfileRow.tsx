import { Pressable, StyleSheet, View } from 'react-native';

import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { mirroredRow } from '@/utils/layout';

import { AppText } from './AppText';

type ProfileRowProps = {
  label: string;
  value?: string;
  onPress?: () => void;
};

export const ProfileRow = ({ label, value, onPress }: ProfileRowProps) => {
  const { isRTL } = useLanguage();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={value ? `${label} ${value}` : label}
      hitSlop={6}
      style={({ pressed }) => [styles.pressable, pressed && onPress ? styles.pressed : null]}>
      <View style={[styles.row, mirroredRow(isRTL)]}>
        <AppText>{label}</AppText>
        {value ? (
          <AppText variant="bodySmall" color={theme.colors.textSecondary} style={styles.value}>
            {value}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  pressed: {
    backgroundColor: theme.colors.primary50,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  value: {
    flexShrink: 1,
  },
});
