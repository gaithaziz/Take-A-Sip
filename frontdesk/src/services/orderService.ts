import { AcceptOrderResponse, OrderListResponse, OrderRead, UsersListResponse } from '@/types/api';

import { http } from './http';

export const orderService = {
  listNewOrders: async () => {
    const { data } = await http.get<OrderListResponse>('/orders', {
      params: { status: 'NEW' },
    });
    return data.orders;
  },
  listLatestOrders: async (params?: {
    status?: string | string[];
    order_type?: 'pickup' | 'delivery';
    limit?: number;
    offset?: number;
  }) => {
    const { data } = await http.get<OrderListResponse>('/orders/latest', { params });
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
  listAvailableDrivers: async (search?: string) => {
    const { data } = await http.get<UsersListResponse>('/admin/drivers/available', { params: { search } });
    return data.users;
  },
  assignDriver: async (orderId: string, driverUserId: string) => {
    const { data } = await http.post<OrderRead>(`/orders/${orderId}/assign-driver`, { driver_user_id: driverUserId });
    return data;
  },
  updateStatus: async (
    orderId: string,
    status: 'NEW' | 'ACCEPTED' | 'ASSIGNED' | 'ASSIGNED_TO_DRIVER' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED',
  ) => {
    const { data } = await http.post<{ id: string; status: string }>(`/orders/${orderId}/status`, { status });
    return data;
  },
};
