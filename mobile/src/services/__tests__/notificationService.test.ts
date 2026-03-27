import AsyncStorage from '@react-native-async-storage/async-storage';

import { notificationApi } from '@/services/notificationApi';
import { notificationService } from '@/services/notificationService';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/services/notificationApi', () => ({
  notificationApi: {
    registerPushToken: jest.fn(async () => undefined),
    deactivatePushToken: jest.fn(async () => undefined),
  },
}));

describe('notificationService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('registers push token for supported roles', async () => {
    await notificationService.syncPushRegistration({
      id: 'user-1',
      first_name: 'Ali',
      last_name: 'Sami',
      phone_number: '+962790000001',
      role: 'CLIENT',
    }, 'ar');

    expect(notificationApi.registerPushToken).toHaveBeenCalledWith(
      expect.objectContaining({
        push_token: 'device-token-123',
      }),
    );
    const payload = (notificationApi.registerPushToken as jest.Mock).mock.calls[0][0];
    expect(['fcm', 'apns']).toContain(payload.push_provider);
    expect(payload.language).toBe('ar');
  });

  it('skips unsupported roles', async () => {
    await notificationService.syncPushRegistration({
      id: 'user-2',
      first_name: 'Front',
      last_name: 'Desk',
      phone_number: '+962790000002',
      role: 'FRONTDESK',
    }, 'en');

    expect(notificationApi.registerPushToken).not.toHaveBeenCalled();
  });

  it('deactivates the stored token on logout cleanup', async () => {
    await AsyncStorage.setItem('take_a_sip_push_token', 'device-token-123');

    await notificationService.unregisterCurrentPushToken();

    expect(notificationApi.deactivatePushToken).toHaveBeenCalledWith({ push_token: 'device-token-123' });
    expect(await AsyncStorage.getItem('take_a_sip_push_token')).toBeNull();
  });
});
