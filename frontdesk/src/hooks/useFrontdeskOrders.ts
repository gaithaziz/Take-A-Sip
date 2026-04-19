import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';

import i18next from '@/i18n';
import { buildReceiptText } from '@/printer/receiptFormatter';
import { buildReceiptArabicLookup, emptyReceiptArabicLookup } from '@/printer/receiptLocalization';
import { sunmiPrinter } from '@/printer/sunmiPrinter';
import { resolveApiBaseUrl } from '@/services/http';
import { menuService } from '@/services/menuService';
import { orderService } from '@/services/orderService';
import { formatOrderReference } from '@/utils/localeFormat';
import { isFrontdeskActionableOrder } from '@/utils/orderPresentation';
import { FrontdeskSocketMessage, OrderRead, UserSummary } from '@/types/api';
import { FrontdeskSocket } from '@/websocket/frontdeskSocket';

const baseUrl = resolveApiBaseUrl();
const ALERT_INTERVAL_MS = 8000;

type FailedPrintJob = {
  order: OrderRead;
  reason: string;
  failedAt: number;
};

export const useFrontdeskOrders = (token: string | null, onUnauthorized: () => Promise<void>) => {
  const isMountedRef = useRef(true);
  const [orders, setOrders] = useState<OrderRead[]>([]);
  const [failedPrints, setFailedPrints] = useState<FailedPrintJob[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>(
    'connecting',
  );
  const [banner, setBanner] = useState<string | null>(null);
  const socketRef = useRef<FrontdeskSocket | null>(null);
  const arabicLookupRef = useRef(emptyReceiptArabicLookup);
  const shopNameRef = useRef((process.env.EXPO_PUBLIC_SHOP_NAME || 'TAKE A SIP').trim());
  const shopNameArabicRef = useRef((process.env.EXPO_PUBLIC_SHOP_NAME_AR || 'خذلك شفة').trim());
  const alertLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertedNewOrderIdsRef = useRef<Set<string>>(new Set());

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

  const loadNewOrders = useCallback(async () => {
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
      try {
        const menu = await menuService.getMenu();
        arabicLookupRef.current = buildReceiptArabicLookup(menu);
      } catch {
        // Keep previous lookup; receipt will fallback to snapshots.
      }
    } catch (error) {
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        await onUnauthorized();
        return;
      }
      if (!isMountedRef.current) {
        return;
      }
      setBanner(i18next.t('banner.loadFailed'));
    }
  }, [onUnauthorized]);

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

    if (message.event === 'order.accepted' || message.event === 'order.assigned') {
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
        await loadNewOrders();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    void boot();

    const socket = new FrontdeskSocket(baseUrl, token, {
      onOpen: () => {
        setConnectionState('connected');
        void loadNewOrders();
      },
      onMessage: (message) => {
        void handleSocketMessage(message).catch(() => {
          if (!isMountedRef.current) {
            return;
          }
          setBanner(i18next.t('banner.realtimeFailed'));
        });
      },
      onClose: () => {
        if (!isMountedRef.current) {
          return;
        }
        setConnectionState('disconnected');
      },
      onError: () => {
        if (!isMountedRef.current) {
          return;
        }
        setConnectionState('disconnected');
      },
      onUnauthorized: () => {
        void onUnauthorized();
      },
    });
    socketRef.current = socket;
    setConnectionState('connecting');
    socket.connect();

    return () => {
      isMounted = false;
      socket.disconnect();
      socketRef.current = null;
      stopAlertLoop();
    };
  }, [handleSocketMessage, loadNewOrders, onUnauthorized, stopAlertLoop, token]);

  const acceptOrder = useCallback(async (order: OrderRead) => {
    try {
      await orderService.acceptOrder(order.id);
    } catch {
      setBanner(i18next.t('banner.acceptFailed'));
      return;
    }

    const isArabic = i18next.language === 'ar';
    try {
      const receipt = buildReceiptText(order, {
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
          order,
          reason: message,
          failedAt: Date.now(),
        },
        ...prev.filter((job) => job.order.id !== order.id),
      ]);
    }
    if (order.order_type === 'delivery') {
      try {
        const updated = await orderService.getOrder(order.id);
        setOrders((prev) => [updated, ...prev.filter((item) => item.id !== order.id)].filter(isFrontdeskActionableOrder));
      } catch {
        setOrders((prev) => prev.filter((item) => item.id !== order.id));
      }
    } else {
      setOrders((prev) => prev.filter((item) => item.id !== order.id));
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
