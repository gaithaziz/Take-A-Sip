import axios from 'axios';
import { NativeModules } from 'react-native';

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

const baseURL = process.env.EXPO_PUBLIC_API_BASE_URL ?? inferLanApiBaseUrl() ?? 'http://localhost:8000';

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
