import { AcceptOrderResponse, OrderListResponse, OrderRead } from '@/types/api';

import { http } from './http';

export const orderService = {
  listNewOrders: async () => {
    const { data } = await http.get<OrderListResponse>('/orders', {
      params: { status: 'NEW' },
    });
    return data.orders;
  },
  getOrder: async (orderId: string) => {
    const { data } = await http.get<OrderRead>(`/orders/${orderId}`);
    return data;
  },
  acceptOrder: async (orderId: string) => {
    const { data } = await http.post<AcceptOrderResponse>(`/orders/${orderId}/accept`);
    return data;
  },
};
