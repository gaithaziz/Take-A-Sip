import { DeactivatePushTokenPayload, RegisterPushTokenPayload } from '@/types/api';

import { http } from './http';

export const notificationApi = {
  async registerPushToken(payload: RegisterPushTokenPayload): Promise<void> {
    await http.post('/notifications/push-token', payload);
  },
  async deactivatePushToken(payload: DeactivatePushTokenPayload): Promise<void> {
    await http.delete('/notifications/push-token', { data: payload });
  },
};
