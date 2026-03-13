import { useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useAuth } from '@/state/AuthContext';
import { useLanguage } from '@/state/LanguageContext';
import { getApiErrorMessage } from '@/utils/errors';

import { AuthScreenView } from './auth/AuthScreenView';

export const AuthScreen = () => {
  const { t, language } = useAppTranslation();
  const { isRTL, toggleLanguage } = useLanguage();
  const { sendOtp, verifyOtp } = useAuth();
  const insets = useSafeAreaInsets();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [loading, setLoading] = useState(false);

  const onSendOtp = async () => {
    if (!firstName.trim() || !lastName.trim() || !phoneNumber.trim()) {
      Alert.alert(t('common.error') ?? 'Error', t('validation.requiredFields'));
      return;
    }
    if (phoneNumber.trim().length < 6) {
      Alert.alert(t('common.error') ?? 'Error', t('validation.invalidPhone'));
      return;
    }
    try {
      setLoading(true);
      await sendOtp({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim(),
      });
      setStep('otp');
      Alert.alert(t('common.appName'), t('auth.otpSent'));
    } catch (error: unknown) {
      Alert.alert(t('common.appName'), getApiErrorMessage(error, t));
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async () => {
    if (otpCode.trim().length < 4) {
      Alert.alert(t('common.error') ?? 'Error', t('validation.invalidOtp'));
      return;
    }
    try {
      setLoading(true);
      await verifyOtp({
        phone_number: phoneNumber.trim(),
        otp_code: otpCode.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
    } catch (error: unknown) {
      Alert.alert(t('common.appName'), getApiErrorMessage(error, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenView
      brandName={t('common.appName')}
      title={t('auth.title')}
      subtitle={t('auth.subtitle')}
      firstNameLabel={t('auth.firstName')}
      lastNameLabel={t('auth.lastName')}
      phoneNumberLabel={t('auth.phoneNumber')}
      otpCodeLabel={t('auth.otpCode')}
      sendOtpLabel={t('auth.sendOtp')}
      verifyOtpLabel={t('auth.verifyOtp')}
      cancelLabel={t('common.cancel')}
      languageToggleLabel={language === 'en' ? t('common.languageArabic') : t('common.languageEnglish')}
      firstName={firstName}
      lastName={lastName}
      phoneNumber={phoneNumber}
      otpCode={otpCode}
      step={step}
      loading={loading}
      isRTL={isRTL}
      topInset={insets.top}
      bottomInset={insets.bottom}
      onChangeFirstName={setFirstName}
      onChangeLastName={setLastName}
      onChangePhoneNumber={setPhoneNumber}
      onChangeOtpCode={setOtpCode}
      onSendOtp={() => void onSendOtp()}
      onVerifyOtp={() => void onVerifyOtp()}
      onCancelOtp={() => setStep('form')}
      onToggleLanguage={() => void toggleLanguage()}
    />
  );
};
