import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { AppState } from 'react-native';

import i18next from '@/i18n';
import { buildReceiptText } from '@/printer/receiptFormatter';
import { buildReceiptArabicLookup, emptyReceiptArabicLookup } from '@/printer/receiptLocalization';
import { sunmiPrinter } from '@/printer/sunmiPrinter';
import { menuService } from '@/services/menuService';
import { orderService } from '@/services/orderService';
import { notificationService } from '@/services/notificationService';
import { formatOrderReference } from '@/utils/localeFormat';
import { isFrontdeskActionableOrder } from '@/utils/orderPresentation';
import { FrontdeskSocketMessage, OrderRead, UserSummary } from '@/types/api';

const ALERT_INTERVAL_MS = 8000;
const ORDER_POLL_INTERVAL_MS = 5 * 60 * 1000;
const MENU_LOOKUP_REFRESH_MS = 5 * 60 * 1000;

type FailedPrintJob = {
  order: OrderRead;
  reason: string;
  failedAt: number;
};

export const useFrontdeskOrders = (token: string | null, recoverSession: () => Promise<boolean>) => {
  const isMountedRef = useRef(true);
  const [orders, setOrders] = useState<OrderRead[]>([]);
  const [failedPrints, setFailedPrints] = useState<FailedPrintJob[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>(
    'connecting',
  );
  const [banner, setBanner] = useState<string | null>(null);
  const arabicLookupRef = useRef(emptyReceiptArabicLookup);
  const shopNameRef = useRef((process.env.EXPO_PUBLIC_SHOP_NAME || 'TAKE A SIP').trim());
  const shopNameArabicRef = useRef((process.env.EXPO_PUBLIC_SHOP_NAME_AR || 'خذلك شفة').trim());
  const alertLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertedNewOrderIdsRef = useRef<Set<string>>(new Set());
  const loadInFlightRef = useRef(false);
  const menuLookupRefreshedAtRef = useRef(0);
  const appStateRef = useRef(AppState.currentState);
  const pushRegisteredRef = useRef(false);

  const stopAlertLoop = useCallback(() => {
    if (alertLoopRef.current) {
      clearInterval(alertLoopRef.current);
      alertLoopRef.current = null;
    }
  }, []);

  const startAlertLoop = useCallback(() => {
    if (alertLoopRef.current) {
      return;
    }
    alertLoopRef.current = setInterval(() => {
      void sunmiPrinter.playAlert();
    }, ALERT_INTERVAL_MS);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      stopAlertLoop();
      isMountedRef.current = false;
    };
  }, [stopAlertLoop]);

  useEffect(() => {
    const newOrderIds = new Set(orders.filter((item) => item.status === 'NEW').map((item) => item.id));

    const hasUnseenNewOrder = Array.from(newOrderIds).some((id) => !alertedNewOrderIdsRef.current.has(id));
    if (hasUnseenNewOrder) {
      Array.from(newOrderIds).forEach((id) => alertedNewOrderIdsRef.current.add(id));
      void sunmiPrinter.playAlert();
    }

    alertedNewOrderIdsRef.current.forEach((id) => {
      if (!newOrderIds.has(id)) {
        alertedNewOrderIdsRef.current.delete(id);
      }
    });

    if (newOrderIds.size > 0) {
      startAlertLoop();
    } else {
      stopAlertLoop();
    }
  }, [orders, startAlertLoop, stopAlertLoop]);

  const refreshMenuLookup = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - menuLookupRefreshedAtRef.current < MENU_LOOKUP_REFRESH_MS) {
      return;
    }
    try {
      const menu = await menuService.getMenu();
      arabicLookupRef.current = buildReceiptArabicLookup(menu);
      menuLookupRefreshedAtRef.current = now;
    } catch {
      // Keep previous lookup; receipt will fallback to snapshots.
    }
  }, []);

  const loadNewOrders = useCallback(async () => {
    if (loadInFlightRef.current) {
      return;
    }
    loadInFlightRef.current = true;
    try {
      const latestOrders = await orderService.listLatestOrders({ limit: 50 });
      if (!isMountedRef.current) {
        return;
      }
      setOrders(latestOrders.filter(isFrontdeskActionableOrder));
      const drivers = await orderService.listAvailableDrivers();
      if (isMountedRef.current) {
        setAvailableDrivers(drivers);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await recoverSession();
        return;
      }
      if (!isMountedRef.current) {
        return;
      }
      setBanner(i18next.t('banner.loadFailed'));
    } finally {
      loadInFlightRef.current = false;
    }
  }, [recoverSession]);

  const handleSocketMessage = useCallback(async (message: FrontdeskSocketMessage) => {
    if (message.event === 'order.created') {
      const fullOrder = await orderService.getOrder(message.order_id);
      if (!isMountedRef.current || fullOrder.status !== 'NEW') {
        return;
      }
      setOrders((prev) => [fullOrder, ...prev.filter((item) => item.id !== fullOrder.id)].filter(isFrontdeskActionableOrder));
      setBanner(i18next.t('banner.newOrder', { number: formatOrderReference(fullOrder.order_number, i18next.language) }));
      if (!alertedNewOrderIdsRef.current.has(fullOrder.id)) {
        alertedNewOrderIdsRef.current.add(fullOrder.id);
        void sunmiPrinter.playAlert();
      }
      startAlertLoop();
      return;
    }

    if (message.event === 'order.accepted' || message.event === 'order.assigned' || message.event === 'order.status_changed') {
      if (!isMountedRef.current) {
        return;
      }
      const fullOrder = await orderService.getOrder(message.order_id);
      setOrders((prev) => {
        const next = [fullOrder, ...prev.filter((item) => item.id !== message.order_id)];
        return next.filter(isFrontdeskActionableOrder);
      });
    }
  }, [startAlertLoop]);

  useEffect(() => {
    if (!token) {
      stopAlertLoop();
      alertedNewOrderIdsRef.current.clear();
      return;
    }

    let isMounted = true;
    const boot = async () => {
      try {
        await refreshMenuLookup(true);
        await loadNewOrders();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    void boot();

    const registerPush = async () => {
      if (pushRegisteredRef.current) {
        return;
      }
      try {
        const registered = await notificationService.syncPushRegistration(i18next.language);
        if (!registered) {
          throw new Error('Push notifications are unavailable');
        }
        pushRegisteredRef.current = true;
        if (isMountedRef.current) {
          setConnectionState('connected');
        }
      } catch (error) {
        console.warn('Frontdesk push registration failed', error);
        if (isMountedRef.current) {
          setConnectionState('disconnected');
        }
      }
    };
    void registerPush();
    const pushRegistrationTimer = setInterval(() => {
      void registerPush();
    }, 60_000);
    const unsubscribeNotifications = notificationService.subscribe(({ orderId }) => {
      void handleSocketMessage({
        event: 'order.created',
        order_id: orderId,
        order_number: 0,
        status: 'NEW',
      }).catch(() => {
        void loadNewOrders();
      });
    });

    setConnectionState('connecting');
    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      const wasInactive = appStateRef.current !== 'active';
      appStateRef.current = nextState;
      if (nextState === 'active' && wasInactive) {
        void refreshMenuLookup();
        void loadNewOrders();
      }
    });
    const pollTimer = setInterval(() => {
      if (appStateRef.current === 'active') {
        void refreshMenuLookup();
        void loadNewOrders();
      }
    }, ORDER_POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      clearInterval(pushRegistrationTimer);
      unsubscribeNotifications();
      appStateSubscription.remove();
      stopAlertLoop();
    };
  }, [handleSocketMessage, loadNewOrders, recoverSession, refreshMenuLookup, stopAlertLoop, token]);

  const acceptOrder = useCallback(async (order: OrderRead) => {
    let acceptedOrder: OrderRead;
    try {
      const response = await orderService.acceptOrder(order.id);
      acceptedOrder = { ...order, status: response.status as OrderRead['status'] };
      setOrders((prev) =>
        [acceptedOrder, ...prev.filter((item) => item.id !== order.id)].filter(isFrontdeskActionableOrder),
      );
    } catch {
      setBanner(i18next.t('banner.acceptFailed'));
      return;
    }

    const isArabic = i18next.language === 'ar';
    try {
      const receipt = buildReceiptText(acceptedOrder, {
        isArabic,
        shopName: shopNameRef.current,
        shopNameArabic: shopNameArabicRef.current,
        arabicLookup: arabicLookupRef.current,
      });
      await sunmiPrinter.printReceipt(receipt, { isArabic });
    } catch (error) {
      const message = error instanceof Error ? error.message : i18next.t('banner.unknownPrintError');
      setBanner(i18next.t('banner.acceptedPrintFailed', { message }));
      setFailedPrints((prev) => [
        {
          order: acceptedOrder,
          reason: message,
          failedAt: Date.now(),
        },
        ...prev.filter((job) => job.order.id !== order.id),
      ]);
    }
    if (acceptedOrder.order_type === 'delivery') {
      try {
        const updated = await orderService.getOrder(acceptedOrder.id);
        setOrders((prev) =>
          [updated, ...prev.filter((item) => item.id !== acceptedOrder.id)].filter(isFrontdeskActionableOrder),
        );
      } catch {
        // Keep the immediate accepted state; the recovery sync will fill in any extra fields.
      }
    }
  }, []);

  const reprintFailedOrder = useCallback(async (orderId: string) => {
    const job = failedPrints.find((item) => item.order.id === orderId);
    if (!job) {
      return;
    }
    const isArabic = i18next.language === 'ar';
    try {
      const receipt = buildReceiptText(job.order, {
        isArabic,
        shopName: shopNameRef.current,
        shopNameArabic: shopNameArabicRef.current,
        arabicLookup: arabicLookupRef.current,
      });
      await sunmiPrinter.printReceipt(receipt, { isArabic });
      setFailedPrints((prev) => prev.filter((item) => item.order.id !== orderId));
      setBanner(i18next.t('banner.reprintSucceeded', { number: formatOrderReference(job.order.order_number, i18next.language) }));
    } catch (error) {
      const message = error instanceof Error ? error.message : i18next.t('banner.unknownPrintError');
      setFailedPrints((prev) =>
        prev.map((item) =>
          item.order.id === orderId ? { ...item, reason: message, failedAt: Date.now() } : item,
        ),
      );
      setBanner(
        i18next.t('banner.reprintFailed', {
          number: formatOrderReference(job.order.order_number, i18next.language),
          message,
        }),
      );
    }
  }, [failedPrints]);

  const dismissFailedOrder = useCallback((orderId: string) => {
    setFailedPrints((prev) => prev.filter((item) => item.order.id !== orderId));
  }, []);

  const assignDriver = useCallback(async (orderId: string, driverUserId: string) => {
    try {
      const updated = await orderService.assignDriver(orderId, driverUserId);
      setOrders((prev) => [updated, ...prev.filter((item) => item.id !== orderId)].filter(isFrontdeskActionableOrder));
      setBanner(i18next.t('banner.driverAssigned', { number: formatOrderReference(updated.order_number, i18next.language) }));
    } catch {
      setBanner(i18next.t('banner.assignFailed'));
    }
  }, []);

  const rejectOrder = useCallback(async (order: OrderRead) => {
    if (order.status !== 'NEW') {
      return;
    }
    try {
      await orderService.updateStatus(order.id, 'CANCELLED');
      setOrders((prev) => prev.filter((item) => item.id !== order.id));
      setBanner(i18next.t('banner.orderRejected', { number: formatOrderReference(order.order_number, i18next.language) }));
    } catch {
      setBanner(i18next.t('banner.rejectFailed'));
    }
  }, []);

  const cancelOrder = useCallback(async (order: OrderRead) => {
    if (order.status !== 'ACCEPTED' && order.status !== 'ASSIGNED' && order.status !== 'ASSIGNED_TO_DRIVER') {
      return;
    }
    try {
      await orderService.updateStatus(order.id, 'CANCELLED');
      setOrders((prev) => prev.filter((item) => item.id !== order.id));
      setBanner(i18next.t('banner.orderCancelled', { number: formatOrderReference(order.order_number, i18next.language) }));
    } catch {
      setBanner(i18next.t('banner.cancelFailed'));
    }
  }, []);

  const completeOrder = useCallback(async (order: OrderRead) => {
    if (order.order_type !== 'pickup' || order.status !== 'ACCEPTED') {
      return;
    }
    try {
      await orderService.updateStatus(order.id, 'COMPLETED');
      setOrders((prev) => prev.filter((item) => item.id !== order.id));
      setBanner(i18next.t('banner.orderCompleted', { number: formatOrderReference(order.order_number, i18next.language) }));
    } catch {
      setBanner(i18next.t('banner.completeFailed'));
    }
  }, []);

  const printTestReceipt = useCallback(async () => {
    if (!sunmiPrinter.isAvailable()) {
      setBanner(i18next.t('banner.printerModuleUnavailable'));
      return;
    }
    const sample = [
      'COFFEE SHOP',
      '--------------------------',
      '',
      'Printer Test',
      `${i18next.t('orders.time')}: ${new Date().toLocaleString(i18next.language === 'ar' ? 'ar-JO' : 'en-US')}`,
      '',
      'If this prints, Sunmi setup is OK.',
      '',
      '--------------------------',
    ].join('\n');
    try {
      await sunmiPrinter.printReceipt(sample, { isArabic: i18next.language === 'ar' });
      setBanner(i18next.t('banner.printerTestSent'));
    } catch (error) {
      const message = error instanceof Error ? error.message : i18next.t('banner.unknownError');
      setBanner(i18next.t('banner.printerTestFailed', { message }));
    }
  }, []);

  const value = useMemo(
    () => ({
      orders,
      failedPrints,
      isLoading,
      connectionState,
      banner,
      clearBanner: () => setBanner(null),
      acceptOrder,
      rejectOrder,
      cancelOrder,
      completeOrder,
      printTestReceipt,
      reprintFailedOrder,
      dismissFailedOrder,
      availableDrivers,
      assignDriver,
      refresh: loadNewOrders,
    }),
    [
      acceptOrder,
      rejectOrder,
      cancelOrder,
      completeOrder,
      banner,
      connectionState,
      dismissFailedOrder,
      availableDrivers,
      assignDriver,
      failedPrints,
      isLoading,
      loadNewOrders,
      orders,
      printTestReceipt,
      reprintFailedOrder,
    ],
  );

  return value;
};
