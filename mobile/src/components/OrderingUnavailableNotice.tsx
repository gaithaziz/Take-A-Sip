import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { theme } from '@/theme';
import { mirroredRow } from '@/utils/layout';

export const OrderingUnavailableNotice = ({ message, isRTL }: { message: string; isRTL: boolean }) => (
  <View style={[styles.notice, mirroredRow(isRTL)]} accessibilityRole="alert">
    <Ionicons name="time-outline" size={theme.iconSizes.md} color={theme.colors.warning} />
    <AppText variant="bodySmall" align={isRTL ? 'right' : 'left'} style={styles.message}>
      {message}
    </AppText>
  </View>
);

const styles = StyleSheet.create({
  notice: {
    borderWidth: 1,
    borderColor: theme.colors.warning,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  message: {
    flex: 1,
  },
});
