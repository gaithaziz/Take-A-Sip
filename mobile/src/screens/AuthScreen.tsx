import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useAuth } from '@/state/AuthContext';
import { theme } from '@/theme';
import { getApiErrorMessage } from '@/utils/errors';

export const AuthScreen = () => {
  const { t } = useAppTranslation();
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
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + theme.spacing.lg,
            paddingBottom: insets.bottom + theme.spacing.xl,
          },
        ]}>
        <View style={styles.container}>
          <View style={styles.header}>
            <AppText variant="h1">{t('auth.title')}</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {t('auth.subtitle')}
            </AppText>
          </View>

          {step === 'form' ? (
            <View style={styles.formStep}>
              <View style={styles.form}>
                <AppInput label={t('auth.firstName')} value={firstName} onChangeText={setFirstName} />
                <AppInput label={t('auth.lastName')} value={lastName} onChangeText={setLastName} />
                <AppInput
                  label={t('auth.phoneNumber')}
                  value={phoneNumber}
                  keyboardType="phone-pad"
                  onChangeText={setPhoneNumber}
                />
              </View>
              <View style={styles.actions}>
                <AppButton title={t('auth.sendOtp')} onPress={onSendOtp} loading={loading} />
              </View>
            </View>
          ) : (
            <View style={styles.formStep}>
              <View style={styles.form}>
                <AppInput
                  label={t('auth.otpCode')}
                  value={otpCode}
                  keyboardType="number-pad"
                  onChangeText={setOtpCode}
                />
              </View>
              <View style={styles.actions}>
                <AppButton title={t('auth.verifyOtp')} onPress={onVerifyOtp} loading={loading} />
                <AppButton title={t('common.cancel')} variant="ghost" onPress={() => setStep('form')} />
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: theme.spacing.xxl,
  },
  header: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  formStep: {
    flexGrow: 1,
    justifyContent: 'space-between',
    gap: theme.spacing.xl,
  },
  form: {
    gap: theme.spacing.lg,
  },
  actions: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
});
