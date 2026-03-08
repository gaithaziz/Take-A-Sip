import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { buildReceiptText } from '@/printer/receiptFormatter';
import { sunmiPrinter } from '@/printer/sunmiPrinter';
import { orderService } from '@/services/orderService';
import { FrontdeskSocketMessage, OrderRead } from '@/types/api';
import { FrontdeskSocket } from '@/websocket/frontdeskSocket';

const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

type FailedPrintJob = {
  order: OrderRead;
  reason: string;
  failedAt: number;
};

export const useFrontdeskOrders = (token: string | null) => {
  const isMountedRef = useRef(true);
  const [orders, setOrders] = useState<OrderRead[]>([]);
  const [failedPrints, setFailedPrints] = useState<FailedPrintJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>(
    'connecting',
  );
  const [banner, setBanner] = useState<string | null>(null);
  const socketRef = useRef<FrontdeskSocket | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadNewOrders = useCallback(async () => {
    try {
      const newOrders = await orderService.listNewOrders();
      if (!isMountedRef.current) {
        return;
      }
      setOrders(newOrders);
    } catch {
      if (!isMountedRef.current) {
        return;
      }
      setBanner('Failed to load latest orders');
    }
  }, []);

  const handleSocketMessage = useCallback(async (message: FrontdeskSocketMessage) => {
    if (message.event === 'order.created') {
      const fullOrder = await orderService.getOrder(message.order_id);
      if (!isMountedRef.current) {
        return;
      }
      if (fullOrder.status !== 'NEW') {
        return;
      }
      setOrders((prev) => [fullOrder, ...prev.filter((item) => item.id !== fullOrder.id)]);
      setBanner(`New order #${fullOrder.order_number}`);
      await sunmiPrinter.playAlert();
      return;
    }

    if (message.event === 'order.accepted') {
      if (!isMountedRef.current) {
        return;
      }
      setOrders((prev) => prev.filter((item) => item.id !== message.order_id));
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
          setBanner('Failed to process realtime message');
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
    });
    socketRef.current = socket;
    setConnectionState('connecting');
    socket.connect();

    return () => {
      isMounted = false;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [handleSocketMessage, loadNewOrders, token]);

  const acceptOrder = useCallback(async (order: OrderRead) => {
    try {
      await orderService.acceptOrder(order.id);
    } catch {
      setBanner('Failed to accept order');
      return;
    }

    try {
      const receipt = buildReceiptText(order);
      await sunmiPrinter.printReceipt(receipt);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown print error';
      setBanner(`Order accepted, print failed: ${message}`);
      setFailedPrints((prev) => [
        {
          order,
          reason: message,
          failedAt: Date.now(),
        },
        ...prev.filter((job) => job.order.id !== order.id),
      ]);
    }
    setOrders((prev) => prev.filter((item) => item.id !== order.id));
  }, []);

  const reprintFailedOrder = useCallback(async (orderId: string) => {
    const job = failedPrints.find((item) => item.order.id === orderId);
    if (!job) {
      return;
    }
    try {
      const receipt = buildReceiptText(job.order);
      await sunmiPrinter.printReceipt(receipt);
      setFailedPrints((prev) => prev.filter((item) => item.order.id !== orderId));
      setBanner(`Reprint succeeded for #${job.order.order_number}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown print error';
      setFailedPrints((prev) =>
        prev.map((item) =>
          item.order.id === orderId ? { ...item, reason: message, failedAt: Date.now() } : item,
        ),
      );
      setBanner(`Reprint failed for #${job.order.order_number}: ${message}`);
    }
  }, [failedPrints]);

  const dismissFailedOrder = useCallback((orderId: string) => {
    setFailedPrints((prev) => prev.filter((item) => item.order.id !== orderId));
  }, []);

  const printTestReceipt = useCallback(async () => {
    if (!sunmiPrinter.isAvailable()) {
      setBanner('Printer module is not available on this build');
      return;
    }
    const sample = [
      'COFFEE SHOP',
      '--------------------------',
      '',
      'Printer Test',
      `Time: ${new Date().toLocaleString()}`,
      '',
      'If this prints, Sunmi setup is OK.',
      '',
      '--------------------------',
    ].join('\n');
    try {
      await sunmiPrinter.printReceipt(sample);
      setBanner('Printer test sent');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setBanner(`Printer test failed: ${message}`);
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
      refresh: loadNewOrders,
    }),
    [
      acceptOrder,
      banner,
      connectionState,
      dismissFailedOrder,
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
