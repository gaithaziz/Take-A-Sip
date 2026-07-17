import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { authService } from '@/services/authService';
import { resolveApiBaseUrl, setAuthToken } from '@/services/http';
import { sessionTokenStore } from '@/services/sessionTokenStore';
import { AuthUser, SendOtpPayload, VerifyOtpPayload } from '@/types/api';

type AuthContextValue = {
  isLoading: boolean;
  token: string | null;
  user: AuthUser | null;
  sendOtp: (payload: SendOtpPayload) => Promise<void>;
  verifyOtp: (payload: VerifyOtpPayload) => Promise<void>;
  recoverSession: () => Promise<boolean>;
  logout: () => Promise<void>;
};

const TOKEN_KEY = 'take_a_sip_frontdesk_token';
const USER_KEY = 'take_a_sip_frontdesk_user';
const AUTH_API_BASE_URL_KEY = 'take_a_sip_frontdesk_api_base_url';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const isDevelopmentBuild =
  typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

const getBootstrapKioskSecret = () =>
  process.env.EXPO_PUBLIC_FRONTDESK_KIOSK_SECRET?.trim() ??
  (isDevelopmentBuild ? process.env.EXPO_PUBLIC_FRONTDESK_DEV_KIOSK_SECRET?.trim() : undefined);

const getBootstrapTokenAuth = (): { token: string; user: AuthUser } | null => {
  const token =
    process.env.EXPO_PUBLIC_FRONTDESK_KIOSK_TOKEN?.trim() ??
    (isDevelopmentBuild ? process.env.EXPO_PUBLIC_FRONTDESK_DEV_TOKEN?.trim() : undefined);
  const userJson =
    process.env.EXPO_PUBLIC_FRONTDESK_KIOSK_USER_JSON?.trim() ??
    (isDevelopmentBuild ? process.env.EXPO_PUBLIC_FRONTDESK_DEV_USER_JSON?.trim() : undefined);
  if (!token || !userJson) {
    return null;
  }

  try {
    return { token, user: JSON.parse(userJson) as AuthUser };
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const recoveryPromiseRef = useRef<Promise<boolean> | null>(null);
  const apiBaseUrl = resolveApiBaseUrl();

  const clearStoredAuth = async () => {
    await Promise.all([
      sessionTokenStore.remove(),
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
      AsyncStorage.removeItem(AUTH_API_BASE_URL_KEY),
    ]);
  };

  const persistAuthState = async (nextToken: string, nextUser: AuthUser) => {
    setToken(nextToken);
    setUser(nextUser);
    setAuthToken(nextToken);
    try {
      await Promise.all([
        sessionTokenStore.set(nextToken),
        AsyncStorage.removeItem(TOKEN_KEY),
        AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser)),
        AsyncStorage.setItem(AUTH_API_BASE_URL_KEY, apiBaseUrl),
      ]);
    } catch {
      // Keep the user signed in in memory even if persistence fails.
    }
  };

  const authenticateKiosk = async () => {
    const kioskSecret = getBootstrapKioskSecret();
    if (!kioskSecret) {
      return false;
    }

    const response = await authService.kioskLogin({ secret: kioskSecret });
    if (response.user.role !== 'FRONTDESK' && response.user.role !== 'ADMIN') {
      return false;
    }
    await persistAuthState(response.access_token, response.user);
    return true;
  };

  const bootstrapAuth = async () => {
    try {
      if (await authenticateKiosk()) {
        return true;
      }
    } catch {
      // Fall back to any legacy baked token below during startup.
    }

    const bootstrap = getBootstrapTokenAuth();
    if (!bootstrap) {
      return false;
    }

    await persistAuthState(bootstrap.token, bootstrap.user);
    return true;
  };

  useEffect(() => {
    const run = async () => {
      try {
        const [savedToken, legacyToken, savedUser, savedApiBaseUrl] = await Promise.all([
          sessionTokenStore.get(),
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
          AsyncStorage.getItem(AUTH_API_BASE_URL_KEY),
        ]);
        const restoredToken = savedToken ?? legacyToken;
        if (legacyToken) {
          await AsyncStorage.removeItem(TOKEN_KEY);
        }
        const shouldRestorePersistedAuth = restoredToken && savedApiBaseUrl === apiBaseUrl;
        if (shouldRestorePersistedAuth) {
          if (!savedToken && legacyToken) {
            await sessionTokenStore.set(legacyToken);
          }
          setToken(restoredToken);
          setAuthToken(restoredToken);
          if (savedUser) {
            setUser(JSON.parse(savedUser) as AuthUser);
          }
        } else {
          await clearStoredAuth();
        }
        if (!shouldRestorePersistedAuth) {
          await bootstrapAuth();
        }
      } catch {
        // Storage can be unavailable after an OS update; kiosk auth must still recover.
        const bootstrapped = await bootstrapAuth();
        if (!bootstrapped) {
          setToken(null);
          setUser(null);
          setAuthToken(null);
        }
      } finally {
        setIsLoading(false);
      }
    };
    void run();
  }, []);

  const sendOtp = async (payload: SendOtpPayload) => {
    await authService.sendOtp(payload);
  };

  const verifyOtp = async (payload: VerifyOtpPayload) => {
    const response = await authService.verifyOtp(payload);
    if (response.user.role !== 'FRONTDESK' && response.user.role !== 'ADMIN') {
      throw new Error('This account is not allowed to use frontdesk.');
    }
    await persistAuthState(response.access_token, response.user);
  };

  const recoverSession = async () => {
    if (!recoveryPromiseRef.current) {
      recoveryPromiseRef.current = authenticateKiosk()
        .catch(() => false)
        .finally(() => {
          recoveryPromiseRef.current = null;
        });
    }
    return recoveryPromiseRef.current;
  };

  const logout = async () => {
    try {
      await clearStoredAuth();
      const bootstrapped = await bootstrapAuth();
      if (bootstrapped) {
        return;
      }
    } catch {
      // Ignore storage cleanup failures to avoid logout crashes.
    }
    setToken(null);
    setUser(null);
    setAuthToken(null);
  };

  const value = useMemo(
    () => ({ isLoading, token, user, sendOtp, verifyOtp, recoverSession, logout }),
    [isLoading, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};
