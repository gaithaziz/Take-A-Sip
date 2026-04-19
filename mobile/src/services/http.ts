import axios from 'axios';
import { NativeModules } from 'react-native';

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

export const http = axios.create({
  baseURL,
  timeout: 10000,
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    http.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }
  delete http.defaults.headers.common.Authorization;
};
