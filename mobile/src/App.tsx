import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { useAssets } from 'expo-asset';
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

import { ErrorBoundary } from './components/ErrorBoundary';
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
  const [assetsLoaded] = useAssets([
    require('../assets/welcome-logo.png'),
    require('../assets/codevex-logo.png'),
  ]);

  return (
    <ErrorBoundary>
      <AppProviders>
        <StatusBar style="dark" />
        {fontsLoaded && assetsLoaded ? <AppNavigator /> : <LoadingState label="Loading..." />}
      </AppProviders>
    </ErrorBoundary>
  );
};
