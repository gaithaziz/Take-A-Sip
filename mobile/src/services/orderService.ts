import { CreateOrderPayload, OrderListResponse, OrderRead } from '@/types/api';

import { http } from './http';

export const orderService = {
  async create(payload: CreateOrderPayload): Promise<OrderRead> {
    const { data } = await http.post('/orders', payload);
    return data;
  },
  async getUserOrders(userId: string): Promise<OrderListResponse> {
    const { data } = await http.get(`/orders/user/${userId}`);
    return data;
  },
  async reorder(orderId: string): Promise<OrderRead> {
    const { data } = await http.post(`/orders/${orderId}/reorder`);
    return data;
  },
};
