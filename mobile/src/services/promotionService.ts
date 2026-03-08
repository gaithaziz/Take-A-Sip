import { ActivePromotionsResponse } from '@/types/api';

import { http } from './http';

export const promotionService = {
  async getActive(): Promise<ActivePromotionsResponse> {
    const { data } = await http.get('/promotions/active');
    return data;
  },
};
