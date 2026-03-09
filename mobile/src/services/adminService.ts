import {
  LoyaltyRuleListResponse,
  MenuEntityType,
  MenuScheduleListResponse,
  OrderListResponse,
  PromotionListResponse,
  RevenueSummaryResponse,
  UserModerationResponse,
  UsersListResponse,
} from '@/types/api';

import { http } from './http';

export const adminService = {
  async createSection(payload: { name_en: string; name_ar: string; image_url?: string; sort_order: number }) {
    const { data } = await http.post('/admin/menu/section', payload);
    return data;
  },

  async createItem(payload: {
    section_id: string;
    name_en: string;
    name_ar: string;
    image_url?: string;
    description_en?: string;
    description_ar?: string;
    sort_order: number;
  }) {
    const { data } = await http.post('/admin/menu/item', payload);
    return data;
  },

  async createType(payload: { item_id: string; name_en: string; name_ar: string; image_url?: string; sort_order: number }) {
    const { data } = await http.post('/admin/menu/type', payload);
    return data;
  },

  async createSize(payload: {
    type_id: string;
    name_en: string;
    name_ar: string;
    image_url?: string;
    price: number;
    sort_order: number;
  }) {
    const { data } = await http.post('/admin/menu/size', payload);
    return data;
  },

  async createAddon(payload: {
    size_id: string;
    name_en: string;
    name_ar: string;
    image_url?: string;
    price: number;
    sort_order: number;
  }) {
    const { data } = await http.post('/admin/menu/addon', payload);
    return data;
  },

  async updateMenuEntity(kind: MenuEntityType, id: string, payload: Record<string, unknown>) {
    const path =
      kind === 'section'
        ? `/admin/menu/section/${id}`
        : kind === 'item'
          ? `/admin/menu/item/${id}`
          : kind === 'type'
            ? `/admin/menu/type/${id}`
            : kind === 'size'
              ? `/admin/menu/size/${id}`
              : `/admin/menu/addon/${id}`;
    const { data } = await http.patch(path, payload);
    return data;
  },

  async toggleMenuEntity(id: string) {
    const { data } = await http.patch(`/admin/menu/${id}/toggle`);
    return data;
  },

  async listSchedules(): Promise<MenuScheduleListResponse> {
    const { data } = await http.get('/admin/menu/schedule');
    return data;
  },

  async createSchedule(payload: {
    entity_type: MenuEntityType;
    entity_id: string;
    start_time: string;
    end_time: string;
    days_of_week: number[];
  }) {
    const { data } = await http.post('/admin/menu/schedule', payload);
    return data;
  },

  async updateSchedule(id: string, payload: Record<string, unknown>) {
    const { data } = await http.patch(`/admin/menu/schedule/${id}`, payload);
    return data;
  },

  async deleteSchedule(id: string) {
    await http.delete(`/admin/menu/schedule/${id}`);
  },

  async listPromotions(): Promise<PromotionListResponse> {
    const { data } = await http.get('/admin/promotions');
    return data;
  },

  async createPromotion(payload: {
    title_en: string;
    title_ar: string;
    type: string;
    value: number;
    starts_at: string;
    ends_at: string;
    is_active: boolean;
  }) {
    const { data } = await http.post('/admin/promotions', payload);
    return data;
  },

  async updatePromotion(id: string, payload: Record<string, unknown>) {
    const { data } = await http.patch(`/admin/promotions/${id}`, payload);
    return data;
  },

  async togglePromotion(id: string) {
    const { data } = await http.patch(`/admin/promotions/${id}/toggle`);
    return data;
  },

  async listLoyaltyRules(): Promise<LoyaltyRuleListResponse> {
    const { data } = await http.get('/admin/loyalty-rules');
    return data;
  },

  async createLoyaltyRule(payload: {
    required_orders: number;
    reward_type: string;
    reward_value: string;
    is_active: boolean;
  }) {
    const { data } = await http.post('/admin/loyalty-rules', payload);
    return data;
  },

  async updateLoyaltyRule(id: string, payload: Record<string, unknown>) {
    const { data } = await http.patch(`/admin/loyalty-rules/${id}`, payload);
    return data;
  },

  async toggleLoyaltyRule(id: string) {
    const { data } = await http.patch(`/admin/loyalty-rules/${id}/toggle`);
    return data;
  },

  async listUsers(search?: string, banned?: boolean | null): Promise<UsersListResponse> {
    const { data } = await http.get('/admin/users', {
      params: {
        search: search || undefined,
        banned: banned === null || banned === undefined ? undefined : banned,
      },
    });
    return data;
  },

  async banUser(id: string, reason?: string): Promise<UserModerationResponse> {
    const { data } = await http.post(`/admin/users/${id}/ban`, { reason });
    return data;
  },

  async unbanUser(id: string): Promise<UserModerationResponse> {
    const { data } = await http.post(`/admin/users/${id}/unban`);
    return data;
  },

  async listOrders(status?: string): Promise<OrderListResponse> {
    const { data } = await http.get('/orders', {
      params: {
        status: status || undefined,
      },
    });
    return data;
  },

  async listUserOrders(userId: string): Promise<OrderListResponse> {
    const { data } = await http.get(`/orders/user/${userId}`);
    return data;
  },

  async listRevenueSummary(): Promise<RevenueSummaryResponse> {
    const { data } = await http.get('/admin/analytics/revenue-summary');
    return data;
  },
};
