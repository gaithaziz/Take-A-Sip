import { api } from '@/services/http';
import { VerifyOtpResponse, SendOtpRequest, VerifyOtpRequest } from '@/types/auth';
import {
  MenuDeleteResponse,
  MenuSchedule,
  MenuResponse,
  ScheduleListResponse,
  ScheduleMenuRequest,
  ScheduleMenuResponse,
  ToggleResponse,
  UUID,
} from '@/types/menu';
import { LoyaltyRulesResponse, PromotionsResponse } from '@/types/promotion';
import { BanRequest, ModerationResponse, UsersResponse } from '@/types/user';

export const adminApi = {
  sendOtp: async (payload: SendOtpRequest) => {
    await api.post('/auth/send-otp', payload);
  },

  verifyOtp: async (payload: VerifyOtpRequest) => {
    const { data } = await api.post<VerifyOtpResponse>('/auth/verify-otp', payload);
    return data;
  },

  getMenu: async () => {
    const { data } = await api.get<MenuResponse>('/admin/menu/tree');
    return data;
  },

  createSection: async (payload: {
    name_en: string;
    name_ar: string;
    image_url?: string;
    sort_order: number;
  }) => {
    const { data } = await api.post('/admin/menu/section', payload);
    return data;
  },

  createItem: async (payload: {
    section_id: UUID;
    name_en: string;
    name_ar: string;
    image_url?: string;
    description_en?: string;
    description_ar?: string;
    sort_order: number;
  }) => {
    const { data } = await api.post('/admin/menu/item', payload);
    return data;
  },

  createType: async (payload: {
    item_id: UUID;
    name_en: string;
    name_ar: string;
    image_url?: string;
    sort_order: number;
  }) => {
    const { data } = await api.post('/admin/menu/type', payload);
    return data;
  },

  createSize: async (payload: {
    type_id: UUID;
    name_en: string;
    name_ar: string;
    image_url?: string;
    price: number;
    sort_order: number;
  }) => {
    const { data } = await api.post('/admin/menu/size', payload);
    return data;
  },

  createAddon: async (payload: {
    size_id: UUID;
    name_en: string;
    name_ar: string;
    image_url?: string;
    price: number;
    sort_order: number;
  }) => {
    const { data } = await api.post('/admin/menu/addon', payload);
    return data;
  },

  updateSection: async (id: UUID, payload: Record<string, unknown>) => {
    const { data } = await api.patch(`/admin/menu/section/${id}`, payload);
    return data;
  },

  updateItem: async (id: UUID, payload: Record<string, unknown>) => {
    const { data } = await api.patch(`/admin/menu/item/${id}`, payload);
    return data;
  },

  updateType: async (id: UUID, payload: Record<string, unknown>) => {
    const { data } = await api.patch(`/admin/menu/type/${id}`, payload);
    return data;
  },

  updateSize: async (id: UUID, payload: Record<string, unknown>) => {
    const { data } = await api.patch(`/admin/menu/size/${id}`, payload);
    return data;
  },

  updateAddon: async (id: UUID, payload: Record<string, unknown>) => {
    const { data } = await api.patch(`/admin/menu/addon/${id}`, payload);
    return data;
  },

  toggleMenuEntity: async (entityId: UUID) => {
    const { data } = await api.patch<ToggleResponse>(`/admin/menu/${entityId}/toggle`);
    return data;
  },

  deleteMenuEntity: async (kind: 'section' | 'item' | 'type' | 'size' | 'addon', id: UUID) => {
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
    const { data } = await api.delete<MenuDeleteResponse>(path);
    return data;
  },

  scheduleMenu: async (payload: ScheduleMenuRequest) => {
    const { data } = await api.post<ScheduleMenuResponse>('/admin/menu/schedule', payload);
    return data;
  },

  getSchedules: async () => {
    const { data } = await api.get<ScheduleListResponse>('/admin/menu/schedule');
    return data;
  },

  updateSchedule: async (id: UUID, payload: Partial<ScheduleMenuRequest & { is_active: boolean }>) => {
    const { data } = await api.patch<MenuSchedule>(`/admin/menu/schedule/${id}`, payload);
    return data;
  },

  deleteSchedule: async (id: UUID) => {
    await api.delete(`/admin/menu/schedule/${id}`);
  },

  getPromotions: async () => {
    const { data } = await api.get<PromotionsResponse>('/admin/promotions');
    return data;
  },

  createPromotion: async (payload: {
    title_en: string;
    title_ar: string;
    type: string;
    value: number;
    starts_at: string;
    ends_at: string;
    is_active: boolean;
  }) => {
    const { data } = await api.post('/admin/promotions', payload);
    return data;
  },

  updatePromotion: async (id: UUID, payload: Record<string, unknown>) => {
    const { data } = await api.patch(`/admin/promotions/${id}`, payload);
    return data;
  },

  togglePromotion: async (id: UUID) => {
    const { data } = await api.patch(`/admin/promotions/${id}/toggle`);
    return data;
  },

  getLoyaltyRules: async () => {
    const { data } = await api.get<LoyaltyRulesResponse>('/admin/loyalty-rules');
    return data;
  },

  createLoyaltyRule: async (payload: {
    required_orders: number;
    reward_type: string;
    reward_value: string;
    is_active: boolean;
  }) => {
    const { data } = await api.post('/admin/loyalty-rules', payload);
    return data;
  },

  updateLoyaltyRule: async (id: UUID, payload: Record<string, unknown>) => {
    const { data } = await api.patch(`/admin/loyalty-rules/${id}`, payload);
    return data;
  },

  toggleLoyaltyRule: async (id: UUID) => {
    const { data } = await api.patch(`/admin/loyalty-rules/${id}/toggle`);
    return data;
  },

  getUsers: async (params?: { search?: string; banned?: boolean }) => {
    const { data } = await api.get<UsersResponse>('/admin/users', { params });
    return data;
  },

  banUser: async (id: UUID, payload: BanRequest) => {
    const { data } = await api.post<ModerationResponse>(`/admin/users/${id}/ban`, payload);
    return data;
  },

  unbanUser: async (id: UUID) => {
    const { data } = await api.post<ModerationResponse>(`/admin/users/${id}/unban`);
    return data;
  },
};

