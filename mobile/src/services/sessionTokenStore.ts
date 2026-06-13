import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'take_a_sip_token';
const REFRESH_TOKEN_KEY = 'take_a_sip_refresh_token';
const KEYCHAIN_SERVICE = 'take-a-sip-mobile-auth';

let secureStoreAvailable: Promise<boolean> | null = null;

const isSecureStoreAvailable = async () => {
  if (!secureStoreAvailable) {
    secureStoreAvailable = SecureStore.isAvailableAsync().catch(() => false);
  }
  return secureStoreAvailable;
};

export const sessionTokenStore = {
  async getAccessToken(): Promise<string | null> {
    if (!(await isSecureStoreAvailable())) {
      return null;
    }
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY, {
        keychainService: KEYCHAIN_SERVICE,
      });
    } catch {
      return null;
    }
  },

  async getRefreshToken(): Promise<string | null> {
    if (!(await isSecureStoreAvailable())) {
      return null;
    }
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY, {
        keychainService: KEYCHAIN_SERVICE,
      });
    } catch {
      return null;
    }
  },

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    if (!(await isSecureStoreAvailable())) {
      return;
    }
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken, {
        keychainService: KEYCHAIN_SERVICE,
      }),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken, {
        keychainService: KEYCHAIN_SERVICE,
      }),
    ]);
  },

  async remove(): Promise<void> {
    if (!(await isSecureStoreAvailable())) {
      return;
    }
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY, {
        keychainService: KEYCHAIN_SERVICE,
      }),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, {
        keychainService: KEYCHAIN_SERVICE,
      }),
    ]);
  },

  async get(): Promise<string | null> {
    return this.getAccessToken();
  },

  async set(token: string): Promise<void> {
    if (!(await isSecureStoreAvailable())) {
      return;
    }
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token, {
      keychainService: KEYCHAIN_SERVICE,
    });
  },
};
