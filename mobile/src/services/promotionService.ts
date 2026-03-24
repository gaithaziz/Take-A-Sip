import { ActivePromotionsResponse, PromotionEvaluationResponse } from '@/types/api';

import { http } from './http';

export const promotionService = {
  async getActive(): Promise<ActivePromotionsResponse> {
    const { data } = await http.get('/promotions/active');
    return data;
  },
  async evaluateCart(payload: {
    items: Array<{
      size_id: string;
      quantity: number;
      addon_ids: string[];
    }>;
  }): Promise<PromotionEvaluationResponse> {
    const { data } = await http.post('/promotions/evaluate', payload);
    return data;
  },
};
