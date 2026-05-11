import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { authService } from '@/services/authService';
import { setAuthToken } from '@/services/http';
import { sessionTokenStore } from '@/services/sessionTokenStore';
import { AuthUser, SendOtpPayload, VerifyOtpPayload } from '@/types/api';

type AuthContextValue = {
  isLoading: boolean;
  token: string | null;
  user: AuthUser | null;
  sendOtp: (payload: SendOtpPayload) => Promise<void>;
  verifyOtp: (payload: VerifyOtpPayload) => Promise<void>;
  logout: () => Promise<void>;
};

const TOKEN_KEY = 'take_a_sip_frontdesk_token';
const USER_KEY = 'take_a_sip_frontdesk_user';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const isDevelopmentBuild =
  typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

const getDevBootstrapAuth = (): { token: string; user: AuthUser } | null => {
  if (!isDevelopmentBuild) {
    return null;
  }

  const token = process.env.EXPO_PUBLIC_FRONTDESK_DEV_TOKEN?.trim();
  const userJson = process.env.EXPO_PUBLIC_FRONTDESK_DEV_USER_JSON?.trim();
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

  useEffect(() => {
    const run = async () => {
      try {
        const [savedToken, legacyToken, savedUser] = await Promise.all([
          sessionTokenStore.get(),
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        const restoredToken = savedToken ?? legacyToken;
        if (legacyToken) {
          await AsyncStorage.removeItem(TOKEN_KEY);
        }
        if (restoredToken) {
          if (!savedToken && legacyToken) {
            await sessionTokenStore.set(legacyToken);
          }
          setToken(restoredToken);
          setAuthToken(restoredToken);
        }
        if (savedUser) {
          setUser(JSON.parse(savedUser) as AuthUser);
        }
        if (!restoredToken) {
          const devAuth = getDevBootstrapAuth();
          if (devAuth) {
            setToken(devAuth.token);
            setUser(devAuth.user);
            setAuthToken(devAuth.token);
            await Promise.all([
              sessionTokenStore.set(devAuth.token),
              AsyncStorage.removeItem(TOKEN_KEY),
              AsyncStorage.setItem(USER_KEY, JSON.stringify(devAuth.user)),
            ]);
          }
        }
      } catch {
        // Continue without persisted auth if local storage is unavailable/corrupt.
        setToken(null);
        setUser(null);
        setAuthToken(null);
      }
      setIsLoading(false);
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
    setToken(response.access_token);
    setUser(response.user);
    setAuthToken(response.access_token);
    try {
      await Promise.all([
        sessionTokenStore.set(response.access_token),
        AsyncStorage.removeItem(TOKEN_KEY),
        AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user)),
      ]);
    } catch {
      // Keep the user signed in memory even if persistence fails.
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    try {
      await Promise.all([sessionTokenStore.remove(), AsyncStorage.removeItem(TOKEN_KEY), AsyncStorage.removeItem(USER_KEY)]);
    } catch {
      // Ignore storage cleanup failures to avoid logout crashes.
    }
  };

  const value = useMemo(
    () => ({ isLoading, token, user, sendOtp, verifyOtp, logout }),
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
