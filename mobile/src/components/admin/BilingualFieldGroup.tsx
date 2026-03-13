import { StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppInput } from '../AppInput';
import { AppText } from '../AppText';

type BilingualFieldGroupProps = {
  labelEn: string;
  labelAr: string;
  valueEn: string;
  valueAr: string;
  onChangeEn: (value: string) => void;
  onChangeAr: (value: string) => void;
  helperText?: string;
};

export const BilingualFieldGroup = ({
  labelEn,
  labelAr,
  valueEn,
  valueAr,
  onChangeEn,
  onChangeAr,
  helperText,
}: BilingualFieldGroupProps) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.fieldsCard}>
        <AppInput label={labelEn} value={valueEn} onChangeText={onChangeEn} />
        <AppInput label={labelAr} value={valueAr} onChangeText={onChangeAr} />
      </View>
      {helperText ? (
        <View style={styles.helperWrap}>
          <AppText variant="caption" color={theme.colors.warning}>
            {helperText}
          </AppText>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.md,
  },
  fieldsCard: {
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.secondaryCream,
    padding: theme.spacing.md,
  },
  helperWrap: {
    borderWidth: 1,
    borderColor: '#e7cba1',
    backgroundColor: theme.colors.warningSurface,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
});
