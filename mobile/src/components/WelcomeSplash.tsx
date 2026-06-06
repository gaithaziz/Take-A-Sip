import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/theme';

import { AppText } from './AppText';

type WelcomeSplashProps = {
  arabicGreeting?: string;
  englishGreeting?: string;
};

export const WelcomeSplash = ({
  arabicGreeting = 'اهلا بك في خذلك شفة',
  englishGreeting = 'Welcome to Take A Sip',
}: WelcomeSplashProps) => {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const compact = width < 390;
  const short = height < 760;
  const footerOffset = Math.max(theme.spacing.xxl, height * 0.08);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + (short ? theme.spacing.xl : theme.spacing.xxxl),
          paddingBottom: insets.bottom + theme.spacing.xxxl,
        },
      ]}>
      <View style={[styles.mainContent, short ? styles.mainContentShort : null]}>
        <Image
          source={require('../../assets/welcome-logo.png')}
          style={[styles.mainLogo, compact || short ? styles.mainLogoCompact : null]}
          resizeMode="contain"
          testID="welcome-main-logo"
        />
        <View style={styles.copyBlock}>
          <AppText
            variant="display"
            align="center"
            allowFontScaling={false}
            style={[styles.arabicGreeting, compact ? styles.arabicGreetingCompact : null]}
            testID="welcome-arabic-greeting">
            {arabicGreeting}
          </AppText>
          <AppText
            variant="display"
            align="center"
            allowFontScaling={false}
            color={theme.colors.primary700}
            style={[styles.englishGreeting, compact || short ? styles.englishGreetingCompact : null]}
            testID="welcome-english-greeting">
            {englishGreeting}
          </AppText>
        </View>
      </View>

      <View style={[styles.creditSection, { paddingBottom: footerOffset }]}>
        <View style={styles.creditRow}>
          <AppText
            variant="bodySmall"
            align="center"
            allowFontScaling={false}
            color={theme.colors.textMuted}
            style={styles.creditText}
            testID="welcome-powered-by">
            Powered by
          </AppText>
          <Image
            source={require('../../assets/codevex-logo.png')}
            style={styles.codevexLogo}
            resizeMode="contain"
            testID="welcome-codevex-logo"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xxl,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: theme.spacing.lg,
    paddingTop: theme.spacing.huge + theme.spacing.xxl,
  },
  mainContentShort: {
    paddingTop: theme.spacing.xxxl,
    gap: theme.spacing.md,
  },
  mainLogo: {
    width: 184,
    height: 184,
  },
  mainLogoCompact: {
    width: 164,
    height: 164,
  },
  copyBlock: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    width: '100%',
    maxWidth: 340,
  },
  arabicGreeting: {
    width: '100%',
    writingDirection: 'rtl',
    fontFamily: 'IBMPlexSansArabic_700Bold',
    fontSize: 24,
    lineHeight: 32,
  },
  arabicGreetingCompact: {
    fontSize: 22,
    lineHeight: 30,
  },
  englishGreeting: {
    width: '100%',
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Inter_600SemiBold',
  },
  englishGreetingCompact: {
    fontSize: 16,
    lineHeight: 22,
  },
  creditSection: {
    alignItems: 'center',
  },
  creditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    minHeight: 38,
  },
  creditText: {
    minWidth: 76,
    flexShrink: 0,
    fontSize: 14,
    lineHeight: 20,
  },
  codevexLogo: {
    width: 108,
    height: 35,
    transform: [{ translateY: -1 }],
  },
});
