import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { WelcomeSplash } from '@/components/WelcomeSplash';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { RootStackParamList } from '@/navigation/types';

const WELCOME_DELAY_MS = 2500;
type WelcomeTargetRoute = 'Auth' | 'MainTabs' | 'AdminTabs' | 'DriverTabs';

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'> & {
  targetRoute: WelcomeTargetRoute;
  onContinue?: () => void;
};

export const WelcomeScreen = ({ navigation, onContinue, targetRoute }: Props) => {
  const { t } = useAppTranslation();
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
          opacity: fadeAnim,
          transform: [{ translateY: translateAnim }],
        },
      ]}>
      <WelcomeSplash arabicGreeting={t('welcome.arabicGreeting')} englishGreeting={t('welcome.englishGreeting')} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
