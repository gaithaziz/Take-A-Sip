import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { isRtlLanguage } from '@/i18n';
import { useAuth } from '@/state/AuthContext';
import { FrontdeskButton, FrontdeskCard } from '@/ui/frontdeskPrimitives';
import { frontdeskTextAlign, frontdeskTheme } from '@/ui/frontdeskTheme';

export const AuthScreen = () => {
  const { t, i18n } = useTranslation();
  const isRTL = isRtlLanguage(i18n.resolvedLanguage ?? i18n.language);
  const { sendOtp, verifyOtp } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpPhone, setOtpPhone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const safeSetError = (value: string | null) => {
    if (isMountedRef.current) {
      setError(value);
    }
  };

  const safeSetIsLoading = (value: boolean) => {
    if (isMountedRef.current) {
      setIsLoading(value);
    }
  };

  const safeSetOtpSent = (value: boolean) => {
    if (isMountedRef.current) {
      setOtpSent(value);
    }
  };

  const normalizePhone = (value: string) => {
    const trimmed = value.trim();
    const hasPlusPrefix = trimmed.startsWith('+');
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (!digitsOnly) {
      return '';
    }
    return hasPlusPrefix ? `+${digitsOnly}` : digitsOnly;
  };

  const onSendOtp = async () => {
    safeSetError(null);
    safeSetIsLoading(true);
    const normalizedPhone = normalizePhone(phone);
    try {
      await sendOtp({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: normalizedPhone,
      });
      setPhone(normalizedPhone);
      setOtpPhone(normalizedPhone);
      setOtp('');
      safeSetOtpSent(true);
    } catch {
      safeSetError(t('auth.sendFailed'));
    } finally {
      safeSetIsLoading(false);
    }
  };

  const onChangePhone = () => {
    safeSetError(null);
    setOtp('');
    setOtpPhone(null);
    safeSetOtpSent(false);
  };

  const onVerify = async () => {
    safeSetError(null);
    safeSetIsLoading(true);
    const normalizedPhone = otpPhone ?? normalizePhone(phone);
    try {
      await verifyOtp({
        phone_number: normalizedPhone,
        otp_code: otp.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const detail = err.response?.data?.detail;
        if (err.response?.status === 400) {
          safeSetError(t('auth.invalidOtp'));
          return;
        }
        if (typeof detail === 'string' && detail.trim()) {
          safeSetError(detail);
          return;
        }
      }
      if (err instanceof Error && err.message.includes('not allowed to use frontdesk')) {
        safeSetError(t('auth.roleNotAllowed'));
        return;
      }
      safeSetError(err instanceof Error ? err.message : t('auth.verifyFailed'));
    } finally {
      safeSetIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <FrontdeskCard style={[styles.authCard, isRTL ? styles.authCardRtl : null]}>
            <View style={[styles.topActions, isRTL ? styles.topActionsRtl : null]}>
              <FrontdeskButton
                label={`${t('orders.language')}: ${i18n.language.toUpperCase()}`}
                variant="secondary"
                isRTL={isRTL}
                minHeight={frontdeskTheme.touch.min}
                onPress={() => void i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en')}
              />
            </View>

            <Text style={[styles.title, isRTL ? frontdeskTextAlign.rtl : frontdeskTextAlign.ltr]}>{t('auth.title')}</Text>

            <TextInput
              style={[styles.input, isRTL ? frontdeskTextAlign.rtl : frontdeskTextAlign.ltr]}
              placeholder={t('auth.firstName')}
              placeholderTextColor="#8A8175"
              value={firstName}
              onChangeText={setFirstName}
              returnKeyType="next"
            />
            <TextInput
              style={[styles.input, isRTL ? frontdeskTextAlign.rtl : frontdeskTextAlign.ltr]}
              placeholder={t('auth.lastName')}
              placeholderTextColor="#8A8175"
              value={lastName}
              onChangeText={setLastName}
              returnKeyType="next"
            />
            <TextInput
              style={[styles.input, isRTL ? frontdeskTextAlign.rtl : frontdeskTextAlign.ltr]}
              placeholder={t('auth.phone')}
              placeholderTextColor="#8A8175"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              editable={!otpSent}
              returnKeyType={otpSent ? 'next' : 'done'}
            />

            {otpSent ? (
              <>
                <TextInput
                  style={[styles.input, isRTL ? frontdeskTextAlign.rtl : frontdeskTextAlign.ltr]}
                  placeholder={t('auth.otp')}
                  placeholderTextColor="#8A8175"
                  keyboardType="number-pad"
                  value={otp}
                  onChangeText={setOtp}
                  returnKeyType="done"
                />

                <View style={styles.secondaryActions}>
                  <FrontdeskButton
                    label={t('auth.resendOtp')}
                    variant="ghost"
                    isRTL={isRTL}
                    minHeight={frontdeskTheme.touch.min}
                    disabled={isLoading}
                    onPress={onSendOtp}
                  />
                  <FrontdeskButton
                    label={t('auth.changePhone')}
                    variant="ghost"
                    isRTL={isRTL}
                    minHeight={frontdeskTheme.touch.min}
                    disabled={isLoading}
                    onPress={onChangePhone}
                  />
                </View>
              </>
            ) : null}

            {error ? (
              <Text style={[styles.error, isRTL ? frontdeskTextAlign.rtl : frontdeskTextAlign.ltr]} numberOfLines={3}>
                {error}
              </Text>
            ) : null}

            {!otpSent ? (
              <FrontdeskButton
                label={t('auth.sendOtp')}
                variant="primary"
                isRTL={isRTL}
                minHeight={frontdeskTheme.touch.large}
                disabled={isLoading}
                onPress={onSendOtp}
              />
            ) : (
              <FrontdeskButton
                label={t('auth.verifyOtp')}
                variant="primary"
                isRTL={isRTL}
                minHeight={frontdeskTheme.touch.large}
                disabled={isLoading}
                onPress={onVerify}
              />
            )}
          </FrontdeskCard>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: frontdeskTheme.spacing.lg,
    paddingBottom: 20,
    backgroundColor: frontdeskTheme.colors.background,
  },
  scroll: {
    flex: 1,
  },
  authCard: {
    borderRadius: frontdeskTheme.radius.xl,
    borderColor: frontdeskTheme.colors.border,
    padding: frontdeskTheme.spacing.lg,
  },
  authCardRtl: {
    alignItems: 'stretch',
  },
  topActions: {
    flexDirection: 'row',
    marginBottom: frontdeskTheme.spacing.md,
    width: '100%',
  },
  topActionsRtl: {
    justifyContent: 'flex-end',
  },
  title: {
    ...frontdeskTheme.typography.titleLg,
    fontSize: 24,
    lineHeight: 30,
    color: frontdeskTheme.colors.textPrimary,
    marginBottom: frontdeskTheme.spacing.lg,
    width: '100%',
    alignSelf: 'stretch',
  },
  input: {
    backgroundColor: frontdeskTheme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: frontdeskTheme.colors.border,
    borderRadius: frontdeskTheme.radius.md,
    paddingHorizontal: frontdeskTheme.spacing.md,
    paddingVertical: frontdeskTheme.spacing.md,
    fontSize: 15,
    marginBottom: frontdeskTheme.spacing.md,
    minHeight: frontdeskTheme.touch.min,
    color: frontdeskTheme.colors.textPrimary,
  },
  secondaryActions: {
    gap: frontdeskTheme.spacing.sm,
    marginTop: -2,
    marginBottom: frontdeskTheme.spacing.sm,
  },
  error: {
    color: '#C62828',
    marginBottom: frontdeskTheme.spacing.md,
    ...frontdeskTheme.typography.body,
    fontWeight: '600',
    width: '100%',
    alignSelf: 'stretch',
  },
});
