import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { buildReceiptText } from '@/printer/receiptFormatter';
import { sunmiPrinter } from '@/printer/sunmiPrinter';
import { orderService } from '@/services/orderService';
import { FrontdeskSocketMessage, OrderRead } from '@/types/api';
import { FrontdeskSocket } from '@/websocket/frontdeskSocket';

const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

export const useFrontdeskOrders = (token: string | null) => {
  const [orders, setOrders] = useState<OrderRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>(
    'connecting',
  );
  const [banner, setBanner] = useState<string | null>(null);
  const socketRef = useRef<FrontdeskSocket | null>(null);

  const loadNewOrders = useCallback(async () => {
    const newOrders = await orderService.listNewOrders();
    setOrders(newOrders);
  }, []);

  const handleSocketMessage = useCallback(async (message: FrontdeskSocketMessage) => {
    if (message.event === 'order.created') {
      const fullOrder = await orderService.getOrder(message.order_id);
      if (fullOrder.status !== 'NEW') {
        return;
      }
      setOrders((prev) => [fullOrder, ...prev.filter((item) => item.id !== fullOrder.id)]);
      setBanner(`New order #${fullOrder.order_number}`);
      await sunmiPrinter.playAlert();
      return;
    }

    if (message.event === 'order.accepted') {
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
        void handleSocketMessage(message);
      },
      onClose: () => setConnectionState('disconnected'),
      onError: () => setConnectionState('disconnected'),
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
    await orderService.acceptOrder(order.id);
    const receipt = buildReceiptText(order);
    await sunmiPrinter.printReceipt(receipt);
    setOrders((prev) => prev.filter((item) => item.id !== order.id));
  }, []);

  const value = useMemo(
    () => ({
      orders,
      isLoading,
      connectionState,
      banner,
      clearBanner: () => setBanner(null),
      acceptOrder,
      refresh: loadNewOrders,
    }),
    [acceptOrder, banner, connectionState, isLoading, loadNewOrders, orders],
  );

  return value;
};
