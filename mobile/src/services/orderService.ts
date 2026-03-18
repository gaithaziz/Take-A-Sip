import {
  CreateOrderPayload,
  DeliveryQuotePayload,
  DeliveryQuoteResponse,
  OrderListResponse,
  OrderRatingRead,
  OrderRead,
  SubmitOrderRatingPayload,
} from '@/types/api';

import { http } from './http';

export const orderService = {
  async create(payload: CreateOrderPayload): Promise<OrderRead> {
    const { data } = await http.post('/orders', payload);
    return data;
  },
  async getDeliveryQuote(payload: DeliveryQuotePayload): Promise<DeliveryQuoteResponse> {
    const { data } = await http.post('/orders/delivery-quote', payload);
    return data;
  },
  async getUserOrders(userId: string): Promise<OrderListResponse> {
    const { data } = await http.get(`/orders/user/${userId}`);
    return data;
  },
  async getMyOrders(): Promise<OrderListResponse> {
    const { data } = await http.get('/orders/my-orders');
    return data;
  },
  async getMyLatest(limit = 20, offset = 0): Promise<OrderListResponse> {
    const { data } = await http.get('/orders/my-latest', { params: { limit, offset } });
    return data;
  },
  async getById(orderId: string): Promise<OrderRead> {
    const { data } = await http.get(`/orders/${orderId}`);
    return data;
  },
  async assignDriver(orderId: string, driverUserId: string): Promise<OrderRead> {
    const { data } = await http.post(`/orders/${orderId}/assign-driver`, { driver_user_id: driverUserId });
    return data;
  },
  async updateStatus(
    orderId: string,
    status: 'NEW' | 'ACCEPTED' | 'ASSIGNED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED',
  ): Promise<{ id: string; status: string }> {
    const { data } = await http.post(`/orders/${orderId}/status`, { status });
    return data;
  },
  async getDriverAssigned(
    status?: 'ASSIGNED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED',
    limit = 20,
    offset = 0,
  ): Promise<OrderListResponse> {
    const { data } = await http.get('/driver/orders/assigned', { params: { status, limit, offset } });
    return data;
  },
  async getDriverLatest(limit = 20, offset = 0): Promise<OrderListResponse> {
    const { data } = await http.get('/driver/orders/latest', { params: { limit, offset } });
    return data;
  },
  async reorder(orderId: string): Promise<OrderRead> {
    const { data } = await http.post(`/orders/${orderId}/reorder`);
    return data;
  },
  async submitRating(orderId: string, payload: SubmitOrderRatingPayload): Promise<OrderRatingRead> {
    const { data } = await http.post(`/orders/${orderId}/rating`, payload);
    return data;
  },
};
