import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { theme } from '@/theme';
import { RootStackParamList } from '@/navigation/types';

const WELCOME_DELAY_MS = 2500;
type WelcomeTargetRoute = 'Auth' | 'MainTabs' | 'AdminTabs' | 'DriverTabs';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'> & {
  targetRoute: WelcomeTargetRoute;
  onContinue?: () => void;
};

export const WelcomeScreen = ({ navigation, onContinue, targetRoute }: Props) => {
  const { t } = useAppTranslation();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      onContinue?.();
      switch (targetRoute) {
        case 'AdminTabs':
          navigation.replace('AdminTabs', { screen: 'AdminDashboard' });
          break;
        case 'DriverTabs':
          navigation.replace('DriverTabs', { screen: 'DriverOrders' });
          break;
        case 'MainTabs':
          navigation.replace('MainTabs', { screen: 'Home' });
          break;
        default:
          navigation.replace('Auth');
      }
    }, WELCOME_DELAY_MS);
    return () => clearTimeout(timer);
  }, [fadeAnim, navigation, onContinue, targetRoute, translateAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + theme.spacing.xxxl,
          paddingBottom: insets.bottom + theme.spacing.xxl,
          opacity: fadeAnim,
          transform: [{ translateY: translateAnim }],
        },
      ]}>
      <View style={styles.mainContent}>
        <Image
          source={require('../../assets/welcome-logo.png')}
          style={styles.mainLogo}
          resizeMode="contain"
          testID="welcome-main-logo"
        />
        <View style={styles.copyBlock}>
          <AppText
            variant="display"
            align="center"
            style={styles.arabicGreeting}
            testID="welcome-arabic-greeting">
            {t('welcome.arabicGreeting')}
          </AppText>
          <AppText
            variant="display"
            align="center"
            color={theme.colors.primary700}
            style={styles.englishGreeting}
            testID="welcome-english-greeting">
            {t('welcome.englishGreeting')}
          </AppText>
        </View>
      </View>

      <View style={styles.creditSection}>
        <View style={styles.creditRow}>
          <AppText variant="bodySmall" align="center" color={theme.colors.textMuted} testID="welcome-powered-by">
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
    </Animated.View>
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
    gap: theme.spacing.xxl,
    paddingTop: theme.spacing.huge,
  },
  mainLogo: {
    width: 232,
    height: 232,
  },
  copyBlock: {
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  arabicGreeting: {
    writingDirection: 'rtl',
    fontFamily: 'IBMPlexSansArabic_700Bold',
    fontSize: 34,
    lineHeight: 42,
  },
  englishGreeting: {
    fontSize: 28,
    lineHeight: 36,
  },
  creditSection: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  creditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  codevexLogo: {
    width: 176,
    height: 64,
  },
});
