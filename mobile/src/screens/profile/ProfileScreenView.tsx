import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { theme } from '@/theme';
import { mirroredRow } from '@/utils/layout';

type ProfileScreenViewProps = {
  title: string;
  userFullName: string;
  phoneLabel: string;
  phoneValue: string;
  languageLabel: string;
  languageValue: string;
  logoutLabel: string;
  isRTL: boolean;
  onToggleLanguage: () => void;
  onLogout: () => void;
};

const initialsFromName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'U';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
};

export const ProfileScreenView = ({
  title,
  userFullName,
  phoneLabel,
  phoneValue,
  languageLabel,
  languageValue,
  logoutLabel,
  isRTL,
  onToggleLanguage,
  onLogout,
}: ProfileScreenViewProps) => {
  return (
    <AppShell>
      <AppText variant="h1">{title}</AppText>

      <AppCard>
        <View style={[styles.userRow, mirroredRow(isRTL)]}>
          <View style={styles.avatar}>
            <AppText variant="button" color={theme.colors.white} align="center">
              {initialsFromName(userFullName)}
            </AppText>
          </View>
          <View style={styles.userInfo}>
            <AppText variant="h3">{userFullName}</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {`${phoneLabel}: ${phoneValue}`}
            </AppText>
          </View>
        </View>
      </AppCard>

      <Pressable
        style={styles.actionPress}
        onPress={onToggleLanguage}
        accessibilityRole="button"
        accessibilityLabel={`${languageLabel} ${languageValue}`}
        hitSlop={6}>
        <AppCard>
          <View style={[styles.actionRow, mirroredRow(isRTL)]}>
            <AppText>{languageLabel}</AppText>
            <AppText variant="bodySmall" color={theme.colors.primary700}>
              {languageValue}
            </AppText>
          </View>
        </AppCard>
      </Pressable>

      <AppButton title={logoutLabel} variant="destructive" onPress={onLogout} />
    </AppShell>
  );
};

const styles = StyleSheet.create({
  userRow: {
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  userInfo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  actionPress: {
    borderRadius: theme.radius.lg,
  },
  actionRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
