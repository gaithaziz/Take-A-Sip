import { Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppText } from './AppText';

type QuantitySelectorProps = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
};

export const QuantitySelector = ({ value, onChange, min = 1 }: QuantitySelectorProps) => {
  return (
    <View style={styles.wrapper}>
      <Pressable style={styles.control} onPress={() => onChange(Math.max(min, value - 1))}>
        <AppText variant="h3">-</AppText>
      </Pressable>
      <AppText variant="h3">{value}</AppText>
      <Pressable style={styles.control} onPress={() => onChange(value + 1)}>
        <AppText variant="h3">+</AppText>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  control: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.secondaryCream,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
