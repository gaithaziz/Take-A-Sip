import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { notificationApi } from './notificationApi';

const DEVICE_ID_KEY = 'take_a_sip_frontdesk_device_id';

export type FrontdeskPushPayload = {
  type: 'frontdesk_new_order' | 'admin_new_order' | 'frontdesk_order_cancelled';
  orderId: string;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const getOrCreateDeviceId = async () => {
  const saved = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (saved) {
    return saved;
  }
  const created = `frontdesk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  return created;
};

const parsePayload = (data: Record<string, unknown>): FrontdeskPushPayload | null => {
  const type = data.type;
  const orderId = data.order_id;
  if (
    (type !== 'frontdesk_new_order' &&
      type !== 'admin_new_order' &&
      type !== 'frontdesk_order_cancelled') ||
    typeof orderId !== 'string'
  ) {
    return null;
  }
  return { type, orderId };
};

export const notificationService = {
  async syncPushRegistration(language: string): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }

    await Notifications.setNotificationChannelAsync('frontdesk_orders', {
      name: 'New orders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: null,
      enableVibrate: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    const current = await Notifications.getPermissionsAsync();
    const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      return false;
    }

    const deviceToken = await Notifications.getDevicePushTokenAsync();
    if (typeof deviceToken.data !== 'string' || !deviceToken.data) {
      return false;
    }

    await notificationApi.registerPushToken({
      push_token: deviceToken.data,
      platform: 'android',
      push_provider: 'fcm',
      device_id: await getOrCreateDeviceId(),
      language: language === 'ar' ? 'ar' : 'en',
    });
    return true;
  },

  subscribe(handler: (payload: FrontdeskPushPayload) => void): () => void {
    const received = Notifications.addNotificationReceivedListener((notification) => {
      const payload = parsePayload(notification.request.content.data ?? {});
      if (payload) {
        handler(payload);
      }
    });
    const response = Notifications.addNotificationResponseReceivedListener((event) => {
      const payload = parsePayload(event.notification.request.content.data ?? {});
      if (payload) {
        handler(payload);
      }
    });

    return () => {
      received.remove();
      response.remove();
    };
  },
};
