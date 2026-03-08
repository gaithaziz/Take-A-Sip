import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/state/AuthContext';

export const AuthScreen = () => {
  const { t } = useTranslation();
  const { sendOtp, verifyOtp } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const onSendOtp = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await sendOtp({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phone.trim(),
      });
      setOtpSent(true);
    } catch {
      setError(t('auth.sendFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const onVerify = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await verifyOtp({
        phone_number: phone.trim(),
        otp_code: otp.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.verifyFailed');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('auth.title')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('auth.firstName')}
        value={firstName}
        onChangeText={setFirstName}
      />
      <TextInput
        style={styles.input}
        placeholder={t('auth.lastName')}
        value={lastName}
        onChangeText={setLastName}
      />
      <TextInput
        style={styles.input}
        placeholder={t('auth.phone')}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      {otpSent ? (
        <TextInput
          style={styles.input}
          placeholder={t('auth.otp')}
          keyboardType="number-pad"
          value={otp}
          onChangeText={setOtp}
        />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
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
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F4F7FC',
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
});
