import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';

import './i18n';

import { LoadingState } from './components/LoadingState';
import { AppNavigator } from './navigation/AppNavigator';
import { AppProviders } from './state/AppProviders';

export const AppRoot = () => {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });

  return (
    <AppProviders>
      <StatusBar style="dark" />
      {fontsLoaded ? <AppNavigator /> : <LoadingState label="Loading..." />}
    </AppProviders>
  );
};
