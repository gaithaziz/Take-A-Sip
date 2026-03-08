import { Alert } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { ProfileRow } from '@/components/ProfileRow';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useAuth } from '@/state/AuthContext';
import { useLanguage } from '@/state/LanguageContext';

export const ProfileScreen = () => {
  const { t, language } = useAppTranslation();
  const { user, logout } = useAuth();
  const { toggleLanguage } = useLanguage();

  const onLogout = async () => {
    await logout();
  };

  return (
    <AppShell>
      <AppText variant="h1">{t('profile.title')}</AppText>
      <ProfileRow label={`${user?.first_name ?? ''} ${user?.last_name ?? ''}`} value={user?.phone_number} />
      <ProfileRow
        label={t('common.language')}
        value={language === 'en' ? t('common.languageEnglish') : t('common.languageArabic')}
        onPress={async () => {
          await toggleLanguage();
        }}
      />
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
