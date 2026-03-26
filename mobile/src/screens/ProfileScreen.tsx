import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { useAppTranslation } from '@/hooks/useAppTranslation';
import { MainTabParamList } from '@/navigation/types';
import { addressBook, SavedAddress } from '@/services/addressBook';
import { useAuth } from '@/state/AuthContext';
import { useLanguage } from '@/state/LanguageContext';
import { getApiErrorMessage } from '@/utils/errors';

import { ProfileScreenView } from './profile/ProfileScreenView';

type Props = BottomTabScreenProps<MainTabParamList, 'Profile'>;

export const ProfileScreen = ({ navigation }: Props) => {
  const { t, language } = useAppTranslation();
  const { user, logout, updateProfile } = useAuth();
  const { toggleLanguage, isRTL } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);

  const fullName = `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim();

  useEffect(() => {
    if (!user?.id) {
      setSavedAddresses([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const entries = await addressBook.list(user.id);
      if (!cancelled) {
        setSavedAddresses(entries);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const onLogout = async () => {
    await logout();
  };

  const onStartEdit = () => {
    setFirstName(user?.first_name ?? '');
    setLastName(user?.last_name ?? '');
    setFormError(null);
    setIsEditing(true);
  };

  const onRemoveSavedAddress = (addressId: string) => {
    if (!user?.id) {
      return;
    }
    void (async () => {
      const nextAddresses = await addressBook.remove(user.id, addressId);
      setSavedAddresses(nextAddresses);
    })();
  };

  const onSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setFormError(t('validation.requiredFields'));
      return;
    }
    try {
      setSaving(true);
      setFormError(null);
      await updateProfile({ first_name: firstName.trim(), last_name: lastName.trim() });
      setIsEditing(false);
    } catch (error: unknown) {
      setFormError(getApiErrorMessage(error, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileScreenView
      title={t('profile.title')}
      userFullName={fullName}
      phoneLabel={t('profile.phone')}
      phoneValue={user?.phone_number ?? '-'}
      languageLabel={t('common.language')}
      languageValue={language === 'en' ? t('common.languageEnglish') : t('common.languageArabic')}
      logoutLabel={t('common.logout')}
      isRTL={isRTL}
      isEditing={isEditing}
      firstNameLabel={t('auth.firstName')}
      lastNameLabel={t('auth.lastName')}
      firstName={firstName}
      lastName={lastName}
      saveProfileLabel={t('profile.saveProfile')}
      editProfileLabel={t('profile.editProfile')}
      accountDetailsLabel={t('profile.accountDetails')}
      quickActionsLabel={t('profile.quickActions')}
      preferencesLabel={t('profile.preferences')}
      accountSafetyLabel={t('profile.accountSafety')}
      ordersShortcutLabel={t('profile.orderHistory')}
      cartShortcutLabel={t('profile.currentCart')}
      addressesShortcutLabel={t('profile.savedAddresses')}
      addressesShortcutValue={
        savedAddresses.length > 0 ? t('profile.savedAddressesCount', { count: savedAddresses.length }) : t('profile.savedAddressesEmpty')
      }
      savedAddresses={savedAddresses}
      removeAddressLabel={t('common.remove')}
      accountStatusLabel={t('profile.accountStatus')}
      accountStatusValue={t('profile.accountStatusActive')}
      accountSupportHint={t('profile.accountSupportHint')}
      settingsLabel={t('profile.settings')}
      cancelLabel={t('common.cancel')}
      formError={formError}
      saving={saving}
      onChangeFirstName={(value) => {
        setFirstName(value);
        setFormError(null);
      }}
      onChangeLastName={(value) => {
        setLastName(value);
        setFormError(null);
      }}
      onToggleLanguage={() => void toggleLanguage()}
      onStartEdit={onStartEdit}
      onCancelEdit={() => {
        setIsEditing(false);
        setFormError(null);
      }}
      onSaveProfile={() => void onSaveProfile()}
      onOpenOrders={() => navigation.navigate('PastOrders')}
      onOpenCart={() => navigation.getParent()?.navigate('Cart')}
      onRemoveSavedAddress={onRemoveSavedAddress}
      onLogout={() => {
        Alert.alert(t('common.appName'), t('common.logout'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.confirm'), style: 'destructive', onPress: () => void onLogout() },
        ]);
      }}
    />
  );
};
