import { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useAuth } from '@/state/AuthContext';
import { useLanguage } from '@/state/LanguageContext';
import { normalizePhoneNumber } from '@/utils/phone';
import { getApiErrorMessage } from '@/utils/errors';

import { AuthScreenView } from './auth/AuthScreenView';

const RESEND_COOLDOWN_SECONDS = 30;

type FormErrors = {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  otpCode?: string;
};

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
  const [errors, setErrors] = useState<FormErrors>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [resentMessage, setResentMessage] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    if (cooldownRemaining <= 0) {
      return undefined;
    }
    const handle = setInterval(() => {
      setCooldownRemaining((previous) => (previous > 1 ? previous - 1 : 0));
    }, 1000);
    return () => clearInterval(handle);
  }, [cooldownRemaining]);

  const normalizedPhoneNumber = useMemo(() => normalizePhoneNumber(phoneNumber), [phoneNumber]);

  const onChangeField = (field: keyof FormErrors, value: string, setter: (next: string) => void) => {
    setter(value);
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    if (field !== 'otpCode') {
      setStatusMessage(null);
    }
  };

  const validateForm = () => {
    const nextErrors: FormErrors = {};
    if (!firstName.trim()) {
      nextErrors.firstName = t('validation.requiredFields');
    }
    if (!lastName.trim()) {
      nextErrors.lastName = t('validation.requiredFields');
    }
    if (!phoneNumber.trim()) {
      nextErrors.phoneNumber = t('validation.requiredFields');
    } else if (!normalizedPhoneNumber) {
      nextErrors.phoneNumber = t('validation.invalidPhone');
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateOtp = () => {
    const nextError = otpCode.trim().length < 4 ? t('validation.invalidOtp') : undefined;
    setErrors((previous) => ({ ...previous, otpCode: nextError }));
    return !nextError;
  };

  const submitSendOtp = async (isResend: boolean) => {
    if (!validateForm() || !normalizedPhoneNumber) {
      return;
    }
    try {
      setLoading(true);
      setPhoneNumber(normalizedPhoneNumber);
      await sendOtp({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: normalizedPhoneNumber,
      });
      setStep('otp');
      setCooldownRemaining(RESEND_COOLDOWN_SECONDS);
      setStatusMessage(t('auth.otpStepMessage'));
      setResentMessage(isResend ? t('auth.otpResent') : t('auth.otpSent'));
    } catch (error: unknown) {
      setResentMessage(null);
      setStatusMessage(getApiErrorMessage(error, t));
    } finally {
      setLoading(false);
    }
  };

  const onSendOtp = async () => {
    await submitSendOtp(false);
  };

  const onVerifyOtp = async () => {
    if (!validateOtp() || !normalizedPhoneNumber) {
      return;
    }
    try {
      setLoading(true);
      setStatusMessage(null);
      await verifyOtp({
        phone_number: normalizedPhoneNumber,
        otp_code: otpCode.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
    } catch (error: unknown) {
      setStatusMessage(getApiErrorMessage(error, t));
    } finally {
      setLoading(false);
    }
  };

  const onEditNumber = () => {
    setStep('form');
    setOtpCode('');
    setErrors((previous) => ({ ...previous, otpCode: undefined }));
    setResentMessage(null);
  };

  return (
    <AuthScreenView
      brandName={t('common.appName')}
      title={t('auth.title')}
      subtitle={t('auth.subtitle')}
      trustMessage={t('auth.trustMessage')}
      staffHint={t('auth.staffHint')}
      firstNameLabel={t('auth.firstName')}
      lastNameLabel={t('auth.lastName')}
      phoneNumberLabel={t('auth.phoneNumber')}
      otpCodeLabel={t('auth.otpCode')}
      sendOtpLabel={t('auth.sendOtp')}
      verifyOtpLabel={t('auth.verifyOtp')}
      cancelLabel={t('common.cancel')}
      editNumberLabel={t('auth.editNumber')}
      resendOtpLabel={t('auth.resendOtp')}
      resendCountdownLabel={t('auth.resendCountdown', { seconds: cooldownRemaining.toString() })}
      otpSentLabel={t('auth.otpSentTo')}
      languageToggleLabel={language === 'en' ? t('common.languageArabic') : t('common.languageEnglish')}
      firstName={firstName}
      lastName={lastName}
      phoneNumber={phoneNumber}
      normalizedPhoneNumber={normalizedPhoneNumber ?? phoneNumber}
      otpCode={otpCode}
      step={step}
      loading={loading}
      isRTL={isRTL}
      topInset={insets.top}
      bottomInset={insets.bottom}
      errors={errors}
      statusMessage={statusMessage}
      resendMessage={resentMessage}
      cooldownRemaining={cooldownRemaining}
      onChangeFirstName={(value) => onChangeField('firstName', value, setFirstName)}
      onChangeLastName={(value) => onChangeField('lastName', value, setLastName)}
      onChangePhoneNumber={(value) => onChangeField('phoneNumber', value, setPhoneNumber)}
      onChangeOtpCode={(value) => onChangeField('otpCode', value.replace(/\D+/g, ''), setOtpCode)}
      onSendOtp={() => void onSendOtp()}
      onVerifyOtp={() => void onVerifyOtp()}
      onCancelOtp={() => {
        onEditNumber();
        setStatusMessage(null);
      }}
      onResendOtp={() => void submitSendOtp(true)}
      onEditNumber={onEditNumber}
      onToggleLanguage={() => void toggleLanguage()}
    />
  );
};
