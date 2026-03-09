import { Pressable, StyleSheet, View } from 'react-native';

import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { mirroredRow } from '@/utils/layout';

import { AppCard } from './AppCard';
import { AppText } from './AppText';

type ProfileRowProps = {
  label: string;
  value?: string;
  onPress?: () => void;
};

export const ProfileRow = ({ label, value, onPress }: ProfileRowProps) => {
  const { isRTL } = useLanguage();
  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <AppCard>
        <View style={[styles.row, mirroredRow(isRTL)]}>
          <AppText>{label}</AppText>
          {value ? (
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {value}
            </AppText>
          ) : null}
        </View>
      </AppCard>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
