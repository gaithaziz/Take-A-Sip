import { AppState, AppStateStatus } from 'react-native';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { storeService } from '@/services/storeService';
import { StoreStatus } from '@/types/api';

type StoreStatusContextValue = {
  status: StoreStatus;
  orderingEnabled: boolean;
  refresh: () => Promise<StoreStatus>;
};

const DEFAULT_STATUS: StoreStatus = { ordering_enabled: true };
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

  const value = useMemo(
    () => ({ status, orderingEnabled: status.ordering_enabled, refresh }),
    [refresh, status],
  );

  return <StoreStatusContext.Provider value={value}>{children}</StoreStatusContext.Provider>;
};

export const useStoreStatus = () => {
  const value = useContext(StoreStatusContext);
  if (!value) throw new Error('useStoreStatus must be used within StoreStatusProvider');
  return value;
};
