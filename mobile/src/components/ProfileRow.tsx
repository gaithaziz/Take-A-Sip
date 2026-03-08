import { Pressable, StyleSheet, View } from 'react-native';

import { theme } from '@/theme';

import { AppCard } from './AppCard';
import { AppText } from './AppText';

type ProfileRowProps = {
  label: string;
  value?: string;
  onPress?: () => void;
};

export const ProfileRow = ({ label, value, onPress }: ProfileRowProps) => {
  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <AppCard>
        <View style={styles.row}>
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
