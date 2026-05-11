import axios from 'axios';

const DEV_FALLBACK_API_BASE_URL = 'http://localhost:8000';

const isDevelopmentBuild =
  typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
const allowReleaseHttp = process.env.EXPO_PUBLIC_FRONTDESK_ALLOW_HTTP === 'true';

const normalizeApiBaseUrl = (value: string) => value.trim().replace(/\/+$/, '');

const assertReleaseSafeApiBaseUrl = (value: string) => {
  if (isDevelopmentBuild || allowReleaseHttp || /^https:\/\//i.test(value)) {
    return value;
  }
  throw new Error('Production builds require EXPO_PUBLIC_API_BASE_URL to use https:// or enable kiosk HTTP');
};

export const resolveApiBaseUrl = () =>
  assertReleaseSafeApiBaseUrl(normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL ?? DEV_FALLBACK_API_BASE_URL));

export const resolveWebSocketBaseUrl = () =>
  resolveApiBaseUrl().replace(/^https?/, (protocol) => (protocol === 'https' ? 'wss' : 'ws'));

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
