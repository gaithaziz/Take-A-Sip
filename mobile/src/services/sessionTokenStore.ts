import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'take_a_sip_token';
const KEYCHAIN_SERVICE = 'take-a-sip-mobile-auth';

let secureStoreAvailable: Promise<boolean> | null = null;

const isSecureStoreAvailable = async () => {
  if (!secureStoreAvailable) {
    secureStoreAvailable = SecureStore.isAvailableAsync().catch(() => false);
  }
  return secureStoreAvailable;
};

export const sessionTokenStore = {
  async get(): Promise<string | null> {
    if (!(await isSecureStoreAvailable())) {
      return null;
    }
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY, {
        keychainService: KEYCHAIN_SERVICE,
      });
    } catch {
      return null;
    }
  },

  async set(token: string): Promise<void> {
    if (!(await isSecureStoreAvailable())) {
      return;
    }
    await SecureStore.setItemAsync(TOKEN_KEY, token, {
      keychainService: KEYCHAIN_SERVICE,
    });
  },

  async remove(): Promise<void> {
    if (!(await isSecureStoreAvailable())) {
      return;
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY, {
      keychainService: KEYCHAIN_SERVICE,
    });
  },
};
