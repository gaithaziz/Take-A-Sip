import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { authService } from '@/services/authService';
import { addressBook } from '@/services/addressBook';
import { setAuthToken } from '@/services/http';
import { notificationService } from '@/services/notificationService';
import { useLanguage } from '@/state/LanguageContext';
import { AuthUser, SendOtpPayload, UpdateProfilePayload, VerifyOtpPayload } from '@/types/api';

type AuthContextValue = {
  isLoading: boolean;
  token: string | null;
  user: AuthUser | null;
  sendOtp: (payload: SendOtpPayload) => Promise<void>;
  verifyOtp: (payload: VerifyOtpPayload) => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
  deleteAccount: () => Promise<void>;
  logout: () => Promise<void>;
};

const TOKEN_KEY = 'take_a_sip_token';
const USER_KEY = 'take_a_sip_user';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const run = async () => {
      const [savedToken, savedUser] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);
      if (savedToken) {
        setAuthToken(savedToken);
        try {
          const profile = await authService.me();
          setToken(savedToken);
          setUser(profile);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(profile));
        } catch {
          setToken(null);
          setUser(null);
          setAuthToken(null);
          await Promise.all([AsyncStorage.removeItem(TOKEN_KEY), AsyncStorage.removeItem(USER_KEY)]);
        }
      } else if (savedUser) {
        await AsyncStorage.removeItem(USER_KEY);
      }
      setIsLoading(false);
    };
    void run();
  }, []);

  useEffect(() => {
    if (!token || !user) {
      return;
    }

    const run = async () => {
      try {
        await notificationService.syncPushRegistration(user, language);
      } catch {
        // Ignore push registration failures so auth flow stays responsive.
      }
    };

    void run();
  }, [language, token, user]);

  const sendOtp = async (payload: SendOtpPayload) => {
    await authService.sendOtp(payload);
  };

  const verifyOtp = async (payload: VerifyOtpPayload) => {
    const response = await authService.verifyOtp(payload);
    setToken(response.access_token);
    setUser(response.user);
    setAuthToken(response.access_token);
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, response.access_token),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user)),
    ]);
  };

  const updateProfile = async (payload: UpdateProfilePayload) => {
    const updatedUser = await authService.updateProfile(payload);
    setUser(updatedUser);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
  };

  const clearLocalSession = async (options?: { userId?: string | null; unregisterPush?: boolean }) => {
    if (options?.unregisterPush) {
      try {
        await notificationService.unregisterCurrentPushToken();
      } catch {
        // Ignore push cleanup failures during sign-out style cleanup.
      }
    }
    if (options?.userId) {
      await addressBook.clear(options.userId);
    }
    setToken(null);
    setUser(null);
    setAuthToken(null);
    await Promise.all([AsyncStorage.removeItem(TOKEN_KEY), AsyncStorage.removeItem(USER_KEY)]);
  };

  const deleteAccount = async () => {
    const currentUserId = user?.id ?? null;
    await authService.deleteAccount();
    await clearLocalSession({ userId: currentUserId, unregisterPush: false });
  };

  const logout = async () => {
    await clearLocalSession({ userId: user?.id ?? null, unregisterPush: true });
  };

  const value = useMemo(
    () => ({ isLoading, token, user, sendOtp, verifyOtp, updateProfile, deleteAccount, logout }),
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
