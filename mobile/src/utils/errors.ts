import axios from 'axios';

type Translator = (key: string) => string;

export const getApiErrorMessage = (error: unknown, t: Translator): string => {
  if (!axios.isAxiosError(error)) {
    return t('errors.generic');
  }

  if (error.code === 'ECONNABORTED') {
    return t('errors.timeout');
  }

  if (!error.response) {
    return t('errors.network');
  }

  const status = error.response.status;
  const detail = String((error.response.data as { detail?: unknown })?.detail ?? '').toLowerCase();

  if (status === 401) {
    return t('errors.authRequired');
  }

  if (status === 403 && detail.includes('banned')) {
    return t('errors.userBanned');
  }

  if (status === 403) {
    return t('errors.forbidden');
  }

  if (status >= 500) {
    return t('errors.server');
  }

  if (detail.length > 0) {
    return detail;
  }

  return t('errors.generic');
};
