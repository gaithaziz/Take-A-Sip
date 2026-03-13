import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { theme } from '@/theme';
import { mirroredRow } from '@/utils/layout';

type AuthStep = 'form' | 'otp';

type AuthScreenViewProps = {
  brandName: string;
  title: string;
  subtitle: string;
  firstNameLabel: string;
  lastNameLabel: string;
  phoneNumberLabel: string;
  otpCodeLabel: string;
  sendOtpLabel: string;
  verifyOtpLabel: string;
  cancelLabel: string;
  languageToggleLabel: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  otpCode: string;
  step: AuthStep;
  loading: boolean;
  isRTL: boolean;
  topInset: number;
  bottomInset: number;
  onChangeFirstName: (value: string) => void;
  onChangeLastName: (value: string) => void;
  onChangePhoneNumber: (value: string) => void;
  onChangeOtpCode: (value: string) => void;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
  onCancelOtp: () => void;
  onToggleLanguage: () => void;
};

export const AuthScreenView = ({
  brandName,
  title,
  subtitle,
  firstNameLabel,
  lastNameLabel,
  phoneNumberLabel,
  otpCodeLabel,
  sendOtpLabel,
  verifyOtpLabel,
  cancelLabel,
  languageToggleLabel,
  firstName,
  lastName,
  phoneNumber,
  otpCode,
  step,
  loading,
  isRTL,
  topInset,
  bottomInset,
  onChangeFirstName,
  onChangeLastName,
  onChangePhoneNumber,
  onChangeOtpCode,
  onSendOtp,
  onVerifyOtp,
  onCancelOtp,
  onToggleLanguage,
}: AuthScreenViewProps) => {
  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: topInset + theme.spacing.lg,
            paddingBottom: bottomInset + theme.spacing.xl,
          },
        ]}>
        <View style={styles.container}>
          <View style={styles.headerWrap}>
            <View style={[styles.languageRow, mirroredRow(isRTL)]}>
              <AppButton title={languageToggleLabel} variant="ghost" fullWidth={false} onPress={onToggleLanguage} />
            </View>
            <View style={styles.brandColumn}>
              <View style={styles.brandMark}>
                <Image source={require('../../../assets/logo.png')} style={styles.brandLogo} resizeMode="cover" />
              </View>
              <View style={styles.brandMeta}>
                <AppText variant="h3" color={theme.colors.primary700} align="center">
                  {brandName}
                </AppText>
                <AppText variant="h1" align="center">
                  {title}
                </AppText>
                <AppText variant="bodySmall" color={theme.colors.textSecondary} align="center">
                  {subtitle}
                </AppText>
              </View>
            </View>
          </View>

          <AppCard style={styles.authCard}>
            {step === 'form' ? (
              <>
                <View style={styles.form}>
                  <AppInput label={firstNameLabel} value={firstName} onChangeText={onChangeFirstName} />
                  <AppInput label={lastNameLabel} value={lastName} onChangeText={onChangeLastName} />
                  <AppInput
                    label={phoneNumberLabel}
                    value={phoneNumber}
                    keyboardType="phone-pad"
                    onChangeText={onChangePhoneNumber}
                  />
                </View>
                <AppButton title={sendOtpLabel} onPress={onSendOtp} loading={loading} />
              </>
            ) : (
              <>
                <View style={styles.form}>
                  <AppInput label={otpCodeLabel} value={otpCode} keyboardType="number-pad" onChangeText={onChangeOtpCode} />
                </View>
                <View style={styles.actions}>
                  <AppButton title={verifyOtpLabel} onPress={onVerifyOtp} loading={loading} />
                  <AppButton title={cancelLabel} variant="ghost" onPress={onCancelOtp} />
                </View>
              </>
            )}
          </AppCard>
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
    justifyContent: 'flex-start',
    gap: theme.spacing.lg,
  },
  headerWrap: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  languageRow: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  brandColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  brandMeta: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  brandMark: {
    width: 115,
    height: 115,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
    overflow: 'hidden',
  },
  brandLogo: {
    width: '100%',
    height: '100%',
  },
  authCard: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  form: {
    gap: theme.spacing.md,
  },
  actions: {
    gap: theme.spacing.sm,
  },
});
