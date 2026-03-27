import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { AuthUser, LanguageCode, PushNotificationPayload, PushPlatform, PushProvider } from '@/types/api';

import { notificationApi } from './notificationApi';

const DEVICE_ID_KEY = 'take_a_sip_device_id';
const PUSH_TOKEN_KEY = 'take_a_sip_push_token';

let lastHandledNotificationId: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const supportedRoles = new Set(['CLIENT', 'ADMIN', 'DRIVER']);

const isSupportedRole = (role?: string | null) => Boolean(role && supportedRoles.has(role));

const generateDeviceId = () => `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const getOrCreateDeviceId = async () => {
  const saved = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (saved) {
    return saved;
  }
  const created = generateDeviceId();
  await AsyncStorage.setItem(DEVICE_ID_KEY, created);
  return created;
};

const getPushPlatform = (): PushPlatform => (Platform.OS === 'ios' ? 'ios' : 'android');

const getPushProvider = (): PushProvider => (Platform.OS === 'ios' ? 'apns' : 'fcm');

const parsePayload = (data: Record<string, unknown>): PushNotificationPayload | null => {
  const type = typeof data.type === 'string' ? data.type : null;
  const orderId = typeof data.order_id === 'string' ? data.order_id : null;
  const roleTarget = typeof data.role_target === 'string' ? data.role_target : null;
  const screen = typeof data.screen === 'string' ? data.screen : undefined;

  if (!type || !orderId || !roleTarget) {
    return null;
  }

  if (!['CLIENT', 'ADMIN', 'DRIVER'].includes(roleTarget)) {
    return null;
  }

  return {
    type,
    order_id: orderId,
    role_target: roleTarget as PushNotificationPayload['role_target'],
    screen: screen as PushNotificationPayload['screen'],
  };
};

const handleResponse = (
  response: Notifications.NotificationResponse | null,
  handler: (payload: PushNotificationPayload) => void,
) => {
  if (!response) {
    return;
  }
  const identifier = response.notification.request.identifier;
  if (identifier && identifier === lastHandledNotificationId) {
    return;
  }
  const rawData = response.notification.request.content.data ?? {};
  const payload = parsePayload(rawData);
  if (!payload) {
    return;
  }
  lastHandledNotificationId = identifier;
  handler(payload);
};

export const notificationService = {
  async syncPushRegistration(user: AuthUser | null, language: LanguageCode): Promise<void> {
    if (!isSupportedRole(user?.role)) {
      return;
    }

    const permissions = await Notifications.getPermissionsAsync();
    const finalPermissions = permissions.granted
      ? permissions
      : await Notifications.requestPermissionsAsync();
    if (!finalPermissions.granted) {
      return;
    }

    const deviceToken = await Notifications.getDevicePushTokenAsync();
    const pushToken = typeof deviceToken.data === 'string' ? deviceToken.data : null;
    if (!pushToken) {
      return;
    }

    await notificationApi.registerPushToken({
      push_token: pushToken,
      platform: getPushPlatform(),
      push_provider: getPushProvider(),
      device_id: await getOrCreateDeviceId(),
      language,
    });
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, pushToken);
  },

  async unregisterCurrentPushToken(): Promise<void> {
    const pushToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!pushToken) {
      return;
    }
    await notificationApi.deactivatePushToken({ push_token: pushToken });
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  },

  subscribeToNotificationResponses(handler: (payload: PushNotificationPayload) => void): () => void {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handleResponse(response, handler);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      handleResponse(response, handler);
    });

    return () => {
      subscription.remove();
    };
  },
};
