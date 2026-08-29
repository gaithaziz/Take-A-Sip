import { AppState, AppStateStatus } from 'react-native';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { storeService } from '@/services/storeService';
import { StoreStatus } from '@/types/api';

type StoreStatusContextValue = {
  status: StoreStatus;
  orderingEnabled: boolean;
  refresh: () => Promise<StoreStatus>;
};

const DEFAULT_STATUS: StoreStatus = {
  ordering_enabled: true,
  accepting_orders: true,
  timezone: 'Asia/Amman',
  working_hours: null,
  minimum_delivery_order_amount: '0.00',
  minimum_pickup_order_amount: '0.00',
};
const StoreStatusContext = createContext<StoreStatusContextValue | null>(null);

export const StoreStatusProvider = ({ children }: PropsWithChildren) => {
  const [status, setStatus] = useState<StoreStatus>(DEFAULT_STATUS);

  const refresh = useCallback(async () => {
    const next = await storeService.getStatus();
    setStatus(next);
    return next;
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void refresh().catch(() => undefined);
      }
    });
    return () => subscription.remove();
  }, [refresh]);

  useEffect(() => {
    if (!status.next_status_change_at) return;
    const delay = new Date(status.next_status_change_at).getTime() - Date.now() + 1000;
    if (delay <= 0) {
      void refresh().catch(() => undefined);
      return;
    }
    const timeout = setTimeout(() => void refresh().catch(() => undefined), Math.min(delay, 2_147_000_000));
    return () => clearTimeout(timeout);
  }, [refresh, status.next_status_change_at]);

  const value = useMemo(
    () => ({ status, orderingEnabled: status.accepting_orders, refresh }),
    [refresh, status],
  );

  return <StoreStatusContext.Provider value={value}>{children}</StoreStatusContext.Provider>;
};

export const useStoreStatus = () => {
  const value = useContext(StoreStatusContext);
  if (!value) throw new Error('useStoreStatus must be used within StoreStatusProvider');
  return value;
};
