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
  const creditLift = Math.max(theme.spacing.huge, height * 0.16);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + theme.spacing.xxxl,
          paddingBottom: insets.bottom + theme.spacing.xxl,
        },
      ]}>
      <View style={styles.mainContent}>
        <Image
          source={require('../../assets/welcome-logo.png')}
          style={[styles.mainLogo, compact ? styles.mainLogoCompact : null]}
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
            style={[styles.englishGreeting, compact ? styles.englishGreetingCompact : null]}
            testID="welcome-english-greeting">
            {englishGreeting}
          </AppText>
        </View>
      </View>

      <View style={[styles.creditSection, { paddingBottom: creditLift }]}>
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
    gap: theme.spacing.xl,
    paddingTop: theme.spacing.xxl,
  },
  mainLogo: {
    width: 196,
    height: 196,
  },
  mainLogoCompact: {
    width: 174,
    height: 174,
  },
  copyBlock: {
    alignItems: 'center',
    gap: theme.spacing.md,
    width: '100%',
    maxWidth: 340,
  },
  arabicGreeting: {
    width: '100%',
    writingDirection: 'rtl',
    fontFamily: 'IBMPlexSansArabic_700Bold',
    fontSize: 25,
    lineHeight: 33,
  },
  arabicGreetingCompact: {
    fontSize: 23,
    lineHeight: 31,
  },
  englishGreeting: {
    width: '100%',
    fontSize: 21,
    lineHeight: 27,
  },
  englishGreetingCompact: {
    fontSize: 18,
    lineHeight: 24,
  },
  creditSection: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  creditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 56,
  },
  creditText: {
    minWidth: 124,
    flexShrink: 0,
    fontSize: 20,
    lineHeight: 28,
  },
  codevexLogo: {
    width: 166,
    height: 54,
    transform: [{ translateY: -1 }],
  },
});
