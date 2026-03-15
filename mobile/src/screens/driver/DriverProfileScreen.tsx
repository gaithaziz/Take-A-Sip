import { Alert } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { ProfileRow } from '@/components/ProfileRow';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useAuth } from '@/state/AuthContext';
import { useLanguage } from '@/state/LanguageContext';

export const DriverProfileScreen = () => {
  const { t, language } = useAppTranslation();
  const { user, logout } = useAuth();
  const { toggleLanguage } = useLanguage();

  return (
    <AppShell>
      <AppCard>
        <AppText variant="h1">{t('driver.profileTitle')}</AppText>
        <AppText>{`${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() || '-'}</AppText>
        <ProfileRow label={t('profile.phone')} value={user?.phone_number ?? '-'} />
      </AppCard>
      <AppCard>
        <ProfileRow
          label={t('common.language')}
          value={language === 'en' ? t('common.languageEnglish') : t('common.languageArabic')}
          onPress={async () => {
            await toggleLanguage();
          }}
        />
      </AppCard>
      <AppButton
        title={t('common.logout')}
        variant="destructive"
        onPress={() => {
          Alert.alert(t('common.appName'), t('common.logout'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.confirm'), style: 'destructive', onPress: () => void logout() },
          ]);
        }}
      />
    </AppShell>
  );
};
