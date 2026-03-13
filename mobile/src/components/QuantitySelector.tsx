import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTranslation } from '@/hooks/useAppTranslation';
import { theme } from '@/theme';

import { AppText } from './AppText';

type QuantitySelectorProps = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
};

export const QuantitySelector = ({ value, onChange, min = 1 }: QuantitySelectorProps) => {
  const { t } = useAppTranslation();
  const canDecrease = value > min;

  return (
    <View style={styles.wrapper}>
      <Pressable
        style={[styles.control, !canDecrease ? styles.controlDisabled : null]}
        onPress={() => onChange(Math.max(min, value - 1))}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canDecrease }}
        accessibilityLabel={t('common.decreaseQuantity')}>
        <AppText variant="button" color={canDecrease ? theme.colors.primary700 : theme.colors.textMuted}>
          -
        </AppText>
      </Pressable>
      <AppText variant="h3" align="center">
        {value}
      </AppText>
      <Pressable
        style={styles.control}
        onPress={() => onChange(value + 1)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('common.increaseQuantity')}>
        <AppText variant="button" color={theme.colors.primary700}>
          +
        </AppText>
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
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  control: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.secondarySand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlDisabled: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
