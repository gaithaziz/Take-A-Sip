import { StoreStatus } from '@/types/api';

import { http } from './http';

export const storeService = {
  async getStatus(): Promise<StoreStatus> {
    const { data } = await http.get('/store/status');
    return data;
  },
};
