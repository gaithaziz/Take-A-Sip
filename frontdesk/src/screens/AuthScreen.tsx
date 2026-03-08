import { useEffect, useRef, useState } from 'react';
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

  const onSendOtp = async () => {
    safeSetError(null);
    safeSetIsLoading(true);
    try {
      await sendOtp({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phone.trim(),
      });
      safeSetOtpSent(true);
    } catch {
      safeSetError(t('auth.sendFailed'));
    } finally {
      safeSetIsLoading(false);
    }
  };

  const onVerify = async () => {
    safeSetError(null);
    safeSetIsLoading(true);
    try {
      await verifyOtp({
        phone_number: phone.trim(),
        otp_code: otp.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.verifyFailed');
      safeSetError(message);
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
            returnKeyType={otpSent ? 'next' : 'done'}
          />
          {otpSent ? (
            <TextInput
              style={[styles.input, isRTL ? styles.rtlText : styles.ltrText]}
              placeholder={t('auth.otp')}
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              returnKeyType="done"
            />
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
    backgroundColor: '#F4F7FC',
  },
  topActions: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  topActionsRtl: {
    flexDirection: 'row-reverse',
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    fontWeight: '700',
    color: '#0C2340',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0C2340',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CFD8E3',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 18,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#0C2340',
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
