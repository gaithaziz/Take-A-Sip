import { PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppDialogProvider } from '@/components/AppDialogProvider';

import { AuthProvider } from './AuthContext';
import { CartProvider } from './CartContext';
import { LanguageProvider } from './LanguageContext';
import { StoreStatusProvider } from './StoreStatusContext';

export const AppProviders = ({ children }: PropsWithChildren) => {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AppDialogProvider>
          <AuthProvider>
            <StoreStatusProvider>
              <CartProvider>{children}</CartProvider>
            </StoreStatusProvider>
          </AuthProvider>
        </AppDialogProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
};
