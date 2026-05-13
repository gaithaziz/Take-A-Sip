import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';

import { initializeI18n } from '@/i18n';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useKioskMode } from '@/hooks/useKioskMode';
import { AppNavigator } from '@/navigation/AppNavigator';
import { AuthScreen } from '@/screens/AuthScreen';
import { AuthProvider, useAuth } from '@/state/AuthContext';

// Work around Sunmi Android thread issues in react-native-screens during auth stack teardown.
enableScreens(false);

const AppContent = () => {
  const { isLoading, token } = useAuth();
  useKioskMode(Boolean(token));

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!token) {
    return <AuthScreen />;
  }

  return <AppNavigator />;
};

const AppShell = () => {
  const [isI18nReady, setIsI18nReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void initializeI18n().finally(() => {
      if (isMounted) {
        setIsI18nReady(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isI18nReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AppShell />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
