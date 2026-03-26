import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, StyleSheet } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { ProfileRow } from '@/components/ProfileRow';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { RootStackParamList } from '@/navigation/types';
import { useAuth } from '@/state/AuthContext';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminProfile'>;

export const AdminProfileScreen = ({ navigation }: Props) => {
  const { t, language } = useAppTranslation();
  const { user, logout } = useAuth();
  const { toggleLanguage } = useLanguage();
  const roleKey = `roles.${(user?.role ?? 'ADMIN').toUpperCase()}`;

  const onLogout = async () => {
    await logout();
  };

  return (
    <AppShell>
      <AppButton title={t('common.goBack')} variant="ghost" fullWidth={false} onPress={() => navigation.goBack()} />
      <AppCard style={styles.headerCard}>
        <AppText variant="h1">{t('admin.profileTitle')}</AppText>
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          {t(roleKey)}
        </AppText>
      </AppCard>

      <AppCard style={styles.profileCard}>
        <AppText variant="h3">{`${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || '-'}</AppText>
        <ProfileRow
          label={`${user?.first_name ?? ''} ${user?.last_name ?? ''}`}
          value={`${t('profile.phone')}: ${user?.phone_number ?? '-'}`}
        />
        <ProfileRow label={t('admin.role')} value={t(roleKey)} />
      </AppCard>

      <AppCard style={styles.preferencesCard}>
        <AppText variant="h3">{t('common.language')}</AppText>
        <ProfileRow
          label={t('common.language')}
          value={language === 'en' ? t('common.languageEnglish') : t('common.languageArabic')}
          onPress={async () => {
            await toggleLanguage();
          }}
        />
      </AppCard>

      <AppCard style={styles.supportCard}>
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          {t('admin.profileSupportHint')}
        </AppText>
      </AppCard>
      <AppButton
        title={t('common.logout')}
        variant="destructive"
        onPress={() => {
          Alert.alert(t('common.appName'), t('common.logout'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.confirm'), style: 'destructive', onPress: () => void onLogout() },
          ]);
        }}
      />
    </AppShell>
  );
};

const styles = StyleSheet.create({
  headerCard: {
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
  },
  profileCard: {
    gap: theme.spacing.sm,
  },
  preferencesCard: {
    gap: theme.spacing.sm,
  },
  supportCard: {
    borderStyle: 'dashed',
  },
});
