import { PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppDialogProvider } from '@/components/AppDialogProvider';

import { AuthProvider } from './AuthContext';
import { CartProvider } from './CartContext';
import { LanguageProvider } from './LanguageContext';

export const AppProviders = ({ children }: PropsWithChildren) => {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AppDialogProvider>
          <AuthProvider>
            <CartProvider>{children}</CartProvider>
          </AuthProvider>
        </AppDialogProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
};
