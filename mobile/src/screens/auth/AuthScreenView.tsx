import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
  trustMessage: string;
  staffHint: string;
  firstNameLabel: string;
  lastNameLabel: string;
  phoneNumberLabel: string;
  otpCodeLabel: string;
  sendOtpLabel: string;
  verifyOtpLabel: string;
  cancelLabel: string;
  editNumberLabel: string;
  resendOtpLabel: string;
  resendCountdownLabel: string;
  otpSentLabel: string;
  languageToggleLabel: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  normalizedPhoneNumber: string;
  otpCode: string;
  step: AuthStep;
  loading: boolean;
  isRTL: boolean;
  topInset: number;
  bottomInset: number;
  errors: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    otpCode?: string;
  };
  statusMessage: string | null;
  resendMessage: string | null;
  cooldownRemaining: number;
  onChangeFirstName: (value: string) => void;
  onChangeLastName: (value: string) => void;
  onChangePhoneNumber: (value: string) => void;
  onChangeOtpCode: (value: string) => void;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
  onCancelOtp: () => void;
  onResendOtp: () => void;
  onEditNumber: () => void;
  onToggleLanguage: () => void;
};

export const AuthScreenView = ({
  brandName,
  title,
  subtitle,
  trustMessage,
  staffHint,
  firstNameLabel,
  lastNameLabel,
  phoneNumberLabel,
  otpCodeLabel,
  sendOtpLabel,
  verifyOtpLabel,
  cancelLabel,
  editNumberLabel,
  resendOtpLabel,
  resendCountdownLabel,
  otpSentLabel,
  languageToggleLabel,
  firstName,
  lastName,
  phoneNumber,
  normalizedPhoneNumber,
  otpCode,
  step,
  loading,
  isRTL,
  topInset,
  bottomInset,
  errors,
  statusMessage,
  resendMessage,
  cooldownRemaining,
  onChangeFirstName,
  onChangeLastName,
  onChangePhoneNumber,
  onChangeOtpCode,
  onSendOtp,
  onVerifyOtp,
  onCancelOtp,
  onResendOtp,
  onEditNumber,
  onToggleLanguage,
}: AuthScreenViewProps) => {
  const canResend = cooldownRemaining === 0 && !loading;

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
            <View style={styles.trustBanner}>
              <AppText variant="caption" color={theme.colors.primary700} align="center">
                {trustMessage}
              </AppText>
            </View>
            <AppText variant="caption" color={theme.colors.textSecondary} align="center">
              {staffHint}
            </AppText>

            {step === 'form' ? (
              <>
                <View style={styles.form}>
                  <AppInput label={firstNameLabel} value={firstName} onChangeText={onChangeFirstName} error={errors.firstName} />
                  <AppInput label={lastNameLabel} value={lastName} onChangeText={onChangeLastName} error={errors.lastName} />
                  <AppInput
                    label={phoneNumberLabel}
                    value={phoneNumber}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    onChangeText={onChangePhoneNumber}
                    error={errors.phoneNumber}
                  />
                </View>
                {statusMessage ? (
                  <AppText variant="caption" color={theme.colors.error}>
                    {statusMessage}
                  </AppText>
                ) : null}
                <AppButton title={sendOtpLabel} onPress={onSendOtp} loading={loading} />
              </>
            ) : (
              <>
                <View style={styles.otpMetaCard}>
                  <AppText variant="caption" color={theme.colors.textSecondary} align="center">
                    {otpSentLabel}
                  </AppText>
                  <AppText variant="h3" align="center">
                    {normalizedPhoneNumber}
                  </AppText>
                  <View style={[styles.otpMetaActions, mirroredRow(isRTL)]}>
                    <AppButton title={editNumberLabel} variant="ghost" fullWidth={false} onPress={onEditNumber} />
                    <AppButton title={cancelLabel} variant="secondary" fullWidth={false} onPress={onCancelOtp} />
                  </View>
                </View>

                <View style={styles.form}>
                  <AppInput
                    label={otpCodeLabel}
                    value={otpCode}
                    keyboardType="number-pad"
                    autoComplete="sms-otp"
                    textContentType="oneTimeCode"
                    maxLength={6}
                    onChangeText={onChangeOtpCode}
                    error={errors.otpCode}
                    style={styles.otpInput}
                  />
                </View>

                {resendMessage ? (
                  <AppText variant="caption" color={theme.colors.primary700} align="center">
                    {resendMessage}
                  </AppText>
                ) : null}
                {statusMessage ? (
                  <AppText variant="caption" color={theme.colors.error} align="center">
                    {statusMessage}
                  </AppText>
                ) : null}

                <View style={styles.actions}>
                  <AppButton title={verifyOtpLabel} onPress={onVerifyOtp} loading={loading} />
                  <AppButton
                    title={canResend ? resendOtpLabel : resendCountdownLabel}
                    variant="ghost"
                    onPress={onResendOtp}
                    disabled={!canResend}
                  />
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
  trustBanner: {
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary50,
    borderWidth: 1,
    borderColor: theme.colors.primary100,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  otpMetaCard: {
    gap: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary100,
    backgroundColor: theme.colors.secondaryCream,
    padding: theme.spacing.md,
  },
  otpMetaActions: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  form: {
    gap: theme.spacing.md,
  },
  actions: {
    gap: theme.spacing.sm,
  },
  otpInput: {
    textAlign: 'center',
    letterSpacing: 10,
    fontSize: 24,
    fontWeight: '700',
  },
});
