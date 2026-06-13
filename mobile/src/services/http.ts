import axios from 'axios';
import { NativeModules } from 'react-native';

import { sessionTokenStore } from './sessionTokenStore';

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    metadata?: {
      startedAt?: number;
    };
    _retryWithRefresh?: boolean;
  }
}

const DEV_FALLBACK_API_BASE_URL = 'http://localhost:8000';

const isDevelopmentBuild =
  typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

const inferLanApiBaseUrl = (): string | null => {
  const scriptURL = NativeModules?.SourceCode?.scriptURL as string | undefined;
  if (!scriptURL) {
    return null;
  }
  // Avoid relying on global URL availability in React Native runtimes.
  const match = scriptURL.match(/^[a-z]+:\/\/([^/:?#]+)/i);
  const host = match?.[1];
  if (!host) {
    return null;
  }
  return `http://${host}:8000`;
};

const normalizeApiBaseUrl = (value: string) => value.trim().replace(/\/+$/, '');

const assertReleaseSafeApiBaseUrl = (value: string) => {
  if (isDevelopmentBuild || /^https:\/\//i.test(value)) {
    return value;
  }
  throw new Error('Production builds require EXPO_PUBLIC_API_BASE_URL to use https://');
};

export const resolveApiBaseUrl = () =>
  assertReleaseSafeApiBaseUrl(
    normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL ?? inferLanApiBaseUrl() ?? DEV_FALLBACK_API_BASE_URL),
  );

const baseURL = resolveApiBaseUrl();
let refreshPromise: Promise<string | null> | null = null;
let authExpiredHandler: (() => void) | null = null;

export const http = axios.create({
  baseURL,
  timeout: 20000,
});

export const setAuthExpiredHandler = (handler: (() => void) | null) => {
  authExpiredHandler = handler;
};

const timedEndpoints = [
  '/admin/menu/tree',
  '/admin/promotions',
  '/admin/menu/schedule',
  '/menu',
  '/promotions/active',
];

http.interceptors.request.use((config) => {
  const url = `${config.url ?? ''}`;
  if (isDevelopmentBuild && timedEndpoints.some((endpoint) => url.startsWith(endpoint))) {
    config.metadata = { ...(config.metadata ?? {}), startedAt: Date.now() };
  }
  return config;
});

http.interceptors.response.use(
  (response) => {
    const startedAt = response.config.metadata?.startedAt;
    if (isDevelopmentBuild && typeof startedAt === 'number') {
      const elapsedMs = Date.now() - startedAt;
      // Keep this dev-only so production builds do not log request timing.
      console.info(`[api-timing] ${response.config.method?.toUpperCase() ?? 'GET'} ${response.config.url} ${elapsedMs}ms`);
    }
    return response;
  },
  async (error) => {
    const startedAt = error?.config?.metadata?.startedAt;
    if (isDevelopmentBuild && typeof startedAt === 'number') {
      const elapsedMs = Date.now() - startedAt;
      console.info(`[api-timing] ${error.config?.method?.toUpperCase() ?? 'GET'} ${error.config?.url} failed ${elapsedMs}ms`);
    }

    const originalRequest = error?.config;
    const status = error?.response?.status;
    const requestUrl = `${originalRequest?.url ?? ''}`;
    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retryWithRefresh &&
      !requestUrl.startsWith('/auth/refresh') &&
      !requestUrl.startsWith('/auth/send-otp') &&
      !requestUrl.startsWith('/auth/verify-otp')
    ) {
      originalRequest._retryWithRefresh = true;
      refreshPromise ??= refreshAccessToken();
      const refreshedToken = await refreshPromise.finally(() => {
        refreshPromise = null;
      });
      if (refreshedToken) {
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${refreshedToken}`;
        return http(originalRequest);
      }
      authExpiredHandler?.();
    }
    return Promise.reject(error);
  },
);

const refreshAccessToken = async () => {
  const refreshToken = await sessionTokenStore.getRefreshToken();
  if (!refreshToken) {
    return null;
  }
  try {
    const { data } = await axios.post(`${baseURL}/auth/refresh`, { refresh_token: refreshToken }, { timeout: 20000 });
    await sessionTokenStore.setTokens(data.access_token, data.refresh_token);
    setAuthToken(data.access_token);
    return data.access_token as string;
  } catch {
    await sessionTokenStore.remove();
    setAuthToken(null);
    return null;
  }
};

export const setAuthToken = (token: string | null) => {
  if (token) {
    http.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }
  delete http.defaults.headers.common.Authorization;
};
