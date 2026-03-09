import { Alert } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { ProfileRow } from '@/components/ProfileRow';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useAuth } from '@/state/AuthContext';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';

export const AdminProfileScreen = () => {
  const { t, language } = useAppTranslation();
  const { user, logout } = useAuth();
  const { toggleLanguage } = useLanguage();
  const roleKey = `roles.${(user?.role ?? 'ADMIN').toUpperCase()}`;

  const onLogout = async () => {
    await logout();
  };

  return (
    <AppShell>
      <AppText variant="h1">{t('admin.profileTitle')}</AppText>
      <AppCard>
        <ProfileRow
          label={`${user?.first_name ?? ''} ${user?.last_name ?? ''}`}
          value={`${t('profile.phone')}: ${user?.phone_number ?? '-'}`}
        />
        <ProfileRow label={t('admin.role')} value={t(roleKey)} />
        <ProfileRow
          label={t('common.language')}
          value={language === 'en' ? t('common.languageEnglish') : t('common.languageArabic')}
          onPress={async () => {
            await toggleLanguage();
          }}
        />
      </AppCard>
      <AppCard>
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
