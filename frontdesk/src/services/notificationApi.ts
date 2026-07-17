import { http } from './http';

export type RegisterPushTokenPayload = {
  push_token: string;
  platform: 'android';
  push_provider: 'fcm';
  device_id: string;
  language: 'en' | 'ar';
};

export const notificationApi = {
  async registerPushToken(payload: RegisterPushTokenPayload): Promise<void> {
    await http.post('/notifications/push-token', payload);
  },
};
