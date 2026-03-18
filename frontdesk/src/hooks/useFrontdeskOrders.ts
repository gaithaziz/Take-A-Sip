import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';

import i18next from '@/i18n';
import { buildReceiptText } from '@/printer/receiptFormatter';
import { buildReceiptArabicLookup, emptyReceiptArabicLookup } from '@/printer/receiptLocalization';
import { sunmiPrinter } from '@/printer/sunmiPrinter';
import { menuService } from '@/services/menuService';
import { orderService } from '@/services/orderService';
import { isFrontdeskActionableOrder } from '@/utils/orderPresentation';
import { FrontdeskSocketMessage, OrderRead, UserSummary } from '@/types/api';
import { FrontdeskSocket } from '@/websocket/frontdeskSocket';

const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

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
  const shopNameArabicRef = useRef((process.env.EXPO_PUBLIC_SHOP_NAME_AR || 'تيك اي سيب').trim());

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
      if (!isMountedRef.current) {
        return;
      }
      if (fullOrder.status !== 'NEW') {
        return;
      }
      setOrders((prev) => [fullOrder, ...prev.filter((item) => item.id !== fullOrder.id)].filter(isFrontdeskActionableOrder));
      setBanner(i18next.t('banner.newOrder', { number: fullOrder.order_number }));
      await sunmiPrinter.playAlert();
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
  }, []);

  useEffect(() => {
    if (!token) {
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
    };
  }, [handleSocketMessage, loadNewOrders, onUnauthorized, token]);

  const acceptOrder = useCallback(async (order: OrderRead) => {
    try {
      await orderService.acceptOrder(order.id);
    } catch {
      setBanner(i18next.t('banner.acceptFailed'));
      return;
    }

    try {
      const receipt = buildReceiptText(order, {
        isArabic: i18next.language === 'ar',
        shopName: shopNameRef.current,
        shopNameArabic: shopNameArabicRef.current,
        arabicLookup: arabicLookupRef.current,
      });
      await sunmiPrinter.printReceipt(receipt);
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
    try {
      const receipt = buildReceiptText(job.order, {
        isArabic: i18next.language === 'ar',
        shopName: shopNameRef.current,
        shopNameArabic: shopNameArabicRef.current,
        arabicLookup: arabicLookupRef.current,
      });
      await sunmiPrinter.printReceipt(receipt);
      setFailedPrints((prev) => prev.filter((item) => item.order.id !== orderId));
      setBanner(i18next.t('banner.reprintSucceeded', { number: job.order.order_number }));
    } catch (error) {
      const message = error instanceof Error ? error.message : i18next.t('banner.unknownPrintError');
      setFailedPrints((prev) =>
        prev.map((item) =>
          item.order.id === orderId ? { ...item, reason: message, failedAt: Date.now() } : item,
        ),
      );
      setBanner(i18next.t('banner.reprintFailed', { number: job.order.order_number, message }));
    }
  }, [failedPrints]);

  const dismissFailedOrder = useCallback((orderId: string) => {
    setFailedPrints((prev) => prev.filter((item) => item.order.id !== orderId));
  }, []);

  const assignDriver = useCallback(async (orderId: string, driverUserId: string) => {
    try {
      const updated = await orderService.assignDriver(orderId, driverUserId);
      setOrders((prev) => [updated, ...prev.filter((item) => item.id !== orderId)].filter(isFrontdeskActionableOrder));
      setBanner(i18next.t('banner.driverAssigned', { number: updated.order_number }));
    } catch {
      setBanner(i18next.t('banner.assignFailed'));
    }
  }, []);

  const rejectOrder = useCallback(async (order: OrderRead) => {
    try {
      await orderService.updateStatus(order.id, 'CANCELLED');
      setOrders((prev) => prev.filter((item) => item.id !== order.id));
      setBanner(i18next.t('banner.orderRejected', { number: order.order_number }));
    } catch {
      setBanner(i18next.t('banner.rejectFailed'));
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
      await sunmiPrinter.printReceipt(sample);
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
      printTestReceipt,
      reprintFailedOrder,
      dismissFailedOrder,
      availableDrivers,
      assignDriver,
      rejectOrder,
      refresh: loadNewOrders,
    }),
    [
      acceptOrder,
      banner,
      connectionState,
      dismissFailedOrder,
      availableDrivers,
      assignDriver,
      rejectOrder,
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
