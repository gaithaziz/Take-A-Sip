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
      <AppInput label={labelEn} value={valueEn} onChangeText={onChangeEn} />
      <AppInput label={labelAr} value={valueAr} onChangeText={onChangeAr} />
      {helperText ? (
        <AppText variant="caption" color={theme.colors.warning}>
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.md,
  },
});
