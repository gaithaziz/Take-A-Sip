import { useKeepAwake } from 'expo-keep-awake';
import { BackHandler, Platform } from 'react-native';
import { useEffect } from 'react';

export const useKioskMode = (enabled: boolean) => {
  useKeepAwake();

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android') {
      return;
    }
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => backHandler.remove();
  }, [enabled]);
};
