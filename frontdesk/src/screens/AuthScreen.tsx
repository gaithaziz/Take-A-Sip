import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/state/AuthContext';

export const AuthScreen = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
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
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <View style={styles.authCard}>
            <View style={[styles.topActions, isRTL ? styles.topActionsRtl : null]}>
              <Pressable
                style={styles.actionButton}
                onPress={() => void i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en')}
              >
                <Text style={[styles.actionText, isRTL ? styles.rtlText : styles.ltrText]}>
                  {t('orders.language')}: {i18n.language.toUpperCase()}
                </Text>
              </Pressable>
            </View>
            <Text style={[styles.title, isRTL ? styles.rtlText : styles.ltrText]}>{t('auth.title')}</Text>
            <TextInput
              style={[styles.input, isRTL ? styles.rtlText : styles.ltrText]}
              placeholder={t('auth.firstName')}
              value={firstName}
              onChangeText={setFirstName}
              returnKeyType="next"
            />
            <TextInput
              style={[styles.input, isRTL ? styles.rtlText : styles.ltrText]}
              placeholder={t('auth.lastName')}
              value={lastName}
              onChangeText={setLastName}
              returnKeyType="next"
            />
            <TextInput
              style={[styles.input, isRTL ? styles.rtlText : styles.ltrText]}
              placeholder={t('auth.phone')}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              editable={!otpSent}
              returnKeyType={otpSent ? 'next' : 'done'}
            />
            {otpSent ? (
              <>
                <TextInput
                  style={[styles.input, isRTL ? styles.rtlText : styles.ltrText]}
                  placeholder={t('auth.otp')}
                  keyboardType="number-pad"
                  value={otp}
                  onChangeText={setOtp}
                  returnKeyType="done"
                />
                <Pressable style={styles.secondaryButton} disabled={isLoading} onPress={onSendOtp}>
                  <Text style={styles.secondaryButtonText}>{t('auth.resendOtp')}</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} disabled={isLoading} onPress={onChangePhone}>
                  <Text style={styles.secondaryButtonText}>{t('auth.changePhone')}</Text>
                </Pressable>
              </>
            ) : null}
            {error ? <Text style={[styles.error, isRTL ? styles.rtlText : styles.ltrText]}>{error}</Text> : null}
            {!otpSent ? (
              <Pressable style={styles.button} disabled={isLoading} onPress={onSendOtp}>
                <Text style={styles.buttonText}>{t('auth.sendOtp')}</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.button} disabled={isLoading} onPress={onVerify}>
                <Text style={styles.buttonText}>{t('auth.verifyOtp')}</Text>
              </Pressable>
            )}
          </View>
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
    padding: 20,
    paddingBottom: 28,
    backgroundColor: '#F7F2EA',
  },
  authCard: {
    backgroundColor: '#FFFEFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6D8C8',
    padding: 16,
    shadowColor: '#4C3921',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  topActions: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  topActionsRtl: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    backgroundColor: '#FFFEFB',
    borderColor: '#E6D8C8',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionText: {
    fontWeight: '700',
    color: '#4C3A28',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#3A2A1B',
    marginBottom: 14,
  },
  input: {
    backgroundColor: '#FFFEFB',
    borderWidth: 1,
    borderColor: '#E6D8C8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 17,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#6B3F1F',
    height: 54,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -2,
    marginBottom: 6,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: '#6B3F1F',
    fontSize: 15,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  error: {
    color: '#C62828',
    marginBottom: 8,
  },
  rtlText: {
    textAlign: 'right',
  },
  ltrText: {
    textAlign: 'left',
  },
});
