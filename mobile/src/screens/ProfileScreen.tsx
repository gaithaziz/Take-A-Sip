import { Alert } from 'react-native';

import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useAuth } from '@/state/AuthContext';
import { useLanguage } from '@/state/LanguageContext';

import { ProfileScreenView } from './profile/ProfileScreenView';

export const ProfileScreen = () => {
  const { t, language } = useAppTranslation();
  const { user, logout } = useAuth();
  const { toggleLanguage, isRTL } = useLanguage();

  const onLogout = async () => {
    await logout();
  };

  return (
    <ProfileScreenView
      title={t('profile.title')}
      userFullName={`${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim()}
      phoneLabel={t('profile.phone')}
      phoneValue={user?.phone_number ?? '-'}
      languageLabel={t('common.language')}
      languageValue={language === 'en' ? t('common.languageEnglish') : t('common.languageArabic')}
      logoutLabel={t('common.logout')}
      isRTL={isRTL}
      onToggleLanguage={() => void toggleLanguage()}
      onLogout={() => {
        Alert.alert(t('common.appName'), t('common.logout'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.confirm'), style: 'destructive', onPress: () => void onLogout() },
        ]);
      }}
    />
  );
};
