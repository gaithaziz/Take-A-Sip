import {
  AdminDashboardAnalyticsResponse,
  AdminRatingSummaryResponse,
  AdminRatingsResponse,
  DeliveryDistanceBandListResponse,
  LoyaltyRuleListResponse,
  MenuEntityType,
  MenuDeleteResponse,
  MenuResponse,
  MenuScheduleListResponse,
  OrderListResponse,
  PromotionListResponse,
  PromotionTargetInput,
  ProvisionStaffResponse,
  RevenueSummaryResponse,
  StaffLifecycleResponse,
  UserModerationResponse,
  UsersListResponse,
} from '@/types/api';

import { http } from './http';

type AdminCacheKey = 'menuTree' | 'promotions' | 'schedules';
type ReactNativeUploadFile = {
  uri: string;
  name: string;
  type: string;
};

const UPLOAD_TIMEOUT_MS = 60000;
const FALLBACK_IMAGE_MIME_TYPE = 'image/jpeg';
const IMAGE_EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'jpg',
  'image/heif': 'jpg',
};

const adminDataCache: Partial<{
  menuTree: MenuResponse;
  promotions: PromotionListResponse;
  schedules: MenuScheduleListResponse;
}> = {};

const pendingAdminDataRequests: Partial<{
  menuTree: Promise<MenuResponse>;
  promotions: Promise<PromotionListResponse>;
  schedules: Promise<MenuScheduleListResponse>;
}> = {};

const cachedRequest = async <K extends AdminCacheKey>(
  key: K,
  loader: () => Promise<NonNullable<(typeof adminDataCache)[K]>>,
) => {
  const cached = adminDataCache[key];
  if (cached) return cached as NonNullable<(typeof adminDataCache)[K]>;

  const pending = pendingAdminDataRequests[key];
  if (pending) return pending as unknown as Promise<NonNullable<(typeof adminDataCache)[K]>>;

  const request = loader()
    .then((data) => {
      adminDataCache[key] = data;
      return data;
    })
    .finally(() => {
      delete pendingAdminDataRequests[key];
    });

  pendingAdminDataRequests[key] = request as unknown as (typeof pendingAdminDataRequests)[K];
  return request;
};

export const invalidateAdminDataCache = (keys?: AdminCacheKey[]) => {
  const targets = keys ?? ['menuTree', 'promotions', 'schedules'];
  targets.forEach((key) => {
    delete adminDataCache[key];
    delete pendingAdminDataRequests[key];
  });
};

const normalizeImageMimeType = (mimeType: string) => {
  const normalized = mimeType.trim().toLowerCase();
  return normalized.startsWith('image/') ? normalized : FALLBACK_IMAGE_MIME_TYPE;
};

const uploadFileName = (fileName: string, mimeType: string) => {
  const originalName = fileName.trim().split('/').pop() || `menu-image-${Date.now()}`;
  const safeName = originalName.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || `menu-image-${Date.now()}`;
  if (/\.[A-Za-z0-9]+$/.test(safeName)) {
    return safeName;
  }
  return `${safeName}.${IMAGE_EXTENSION_BY_MIME_TYPE[mimeType] ?? 'jpg'}`;
};

export const adminService = {
  async getMenuTree(options?: { force?: boolean }): Promise<MenuResponse> {
    if (options?.force) {
      delete pendingAdminDataRequests.menuTree;
      const { data } = await http.get('/admin/menu/tree');
      adminDataCache.menuTree = data;
      return data;
    }
    return cachedRequest('menuTree', async () => {
      const { data } = await http.get('/admin/menu/tree');
      return data;
    });
  },

  async uploadImage(fileUri: string, fileName: string, mimeType: string): Promise<{ url: string }> {
    const normalizedMimeType = normalizeImageMimeType(mimeType);
    const form = new FormData();
    const file: ReactNativeUploadFile = {
      uri: fileUri,
      name: uploadFileName(fileName, normalizedMimeType),
      type: normalizedMimeType,
    };
    form.append('file', file as unknown as Blob);
    const { data } = await http.post('/admin/uploads/image', form, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: UPLOAD_TIMEOUT_MS,
      transformRequest: (body) => body,
    });
    return data;
  },

  async createSection(payload: { name_en: string; name_ar: string; image_url?: string; sort_order: number }) {
    const { data } = await http.post('/admin/menu/section', payload);
    invalidateAdminDataCache(['menuTree']);
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
    invalidateAdminDataCache(['menuTree']);
    return data;
  },

  async createType(payload: { item_id: string; name_en: string; name_ar: string; image_url?: string; sort_order: number }) {
    const { data } = await http.post('/admin/menu/type', payload);
    invalidateAdminDataCache(['menuTree']);
    return data;
  },

  async createSize(payload: {
    type_id: string;
    name_en: string;
    name_ar: string;
    image_url?: string;
    price: number;
    order_limit?: number | null;
    sort_order: number;
  }) {
    const { data } = await http.post('/admin/menu/size', payload);
    invalidateAdminDataCache(['menuTree']);
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
    invalidateAdminDataCache(['menuTree']);
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
    invalidateAdminDataCache(['menuTree']);
    return data;
  },

  async toggleMenuEntity(id: string) {
    const { data } = await http.patch(`/admin/menu/${id}/toggle`);
    invalidateAdminDataCache(['menuTree']);
    return data;
  },

  async deleteMenuEntity(kind: MenuEntityType, id: string): Promise<MenuDeleteResponse> {
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
    const { data } = await http.delete(path);
    invalidateAdminDataCache(['menuTree', 'schedules']);
    return data;
  },

  async listSchedules(): Promise<MenuScheduleListResponse> {
    return cachedRequest('schedules', async () => {
      const { data } = await http.get('/admin/menu/schedule');
      return data;
    });
  },

  async createSchedule(payload: {
    entity_type: MenuEntityType;
    entity_id: string;
    start_time: string;
    end_time: string;
    days_of_week: number[];
  }) {
    const { data } = await http.post('/admin/menu/schedule', payload);
    invalidateAdminDataCache(['menuTree', 'schedules']);
    return data;
  },

  async updateSchedule(id: string, payload: Record<string, unknown>) {
    const { data } = await http.patch(`/admin/menu/schedule/${id}`, payload);
    invalidateAdminDataCache(['menuTree', 'schedules']);
    return data;
  },

  async deleteSchedule(id: string) {
    await http.delete(`/admin/menu/schedule/${id}`);
    invalidateAdminDataCache(['menuTree', 'schedules']);
  },

  async listPromotions(): Promise<PromotionListResponse> {
    return cachedRequest('promotions', async () => {
      const { data } = await http.get('/admin/promotions');
      return data;
    });
  },

  async createPromotion(payload: {
    title_en: string;
    title_ar: string;
    type: string;
    value: number;
    starts_at: string;
    ends_at: string;
    is_active: boolean;
    required_completed_orders?: number | null;
    buy_quantity?: number | null;
    free_quantity?: number | null;
    free_delivery_mode?: 'FREE_DELIVERY' | 'PERCENTAGE_DISCOUNT' | null;
    free_delivery_discount_percent?: number | null;
    loyalty_rule_id?: string | null;
    targets: PromotionTargetInput[];
    buy_targets?: PromotionTargetInput[];
    free_targets?: PromotionTargetInput[];
  }) {
    const { data } = await http.post('/admin/promotions', payload);
    invalidateAdminDataCache(['promotions']);
    return data;
  },

  async updatePromotion(id: string, payload: Record<string, unknown>) {
    const { data } = await http.patch(`/admin/promotions/${id}`, payload);
    invalidateAdminDataCache(['promotions']);
    return data;
  },

  async deletePromotion(id: string) {
    await http.delete(`/admin/promotions/${id}`);
    invalidateAdminDataCache(['promotions']);
  },

  async togglePromotion(id: string) {
    const { data } = await http.patch(`/admin/promotions/${id}/toggle`);
    invalidateAdminDataCache(['promotions']);
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

  async listUsers(search?: string, banned?: boolean | null, role?: 'CLIENT' | 'ADMIN' | 'FRONTDESK' | 'DRIVER'): Promise<UsersListResponse> {
    const { data } = await http.get('/admin/users', {
      params: {
        search: search || undefined,
        banned: banned === null || banned === undefined ? undefined : banned,
        role: role || undefined,
      },
    });
    return data;
  },
  async listDrivers(search?: string, isActive?: boolean): Promise<UsersListResponse> {
    const { data } = await http.get('/admin/drivers', {
      params: {
        search: search || undefined,
        is_active: isActive === undefined ? undefined : isActive,
      },
    });
    return data;
  },
  async listAvailableDrivers(search?: string): Promise<UsersListResponse> {
    const { data } = await http.get('/admin/drivers/available', {
      params: {
        search: search || undefined,
      },
    });
    return data;
  },
  async listDeliveryDistanceBands(): Promise<DeliveryDistanceBandListResponse> {
    const { data } = await http.get('/admin/delivery/distance-bands');
    return data;
  },
  async createDeliveryDistanceBand(payload: {
    min_distance_km: number;
    max_distance_km: number;
    fee_amount: number;
    is_active: boolean;
    sort_order: number;
  }) {
    const { data } = await http.post('/admin/delivery/distance-bands', payload);
    return data;
  },
  async updateDeliveryDistanceBand(id: string, payload: Record<string, unknown>) {
    const { data } = await http.patch(`/admin/delivery/distance-bands/${id}`, payload);
    return data;
  },
  async deleteDeliveryDistanceBand(id: string) {
    await http.delete(`/admin/delivery/distance-bands/${id}`);
  },

  async banUser(id: string, reason?: string): Promise<UserModerationResponse> {
    const { data } = await http.post(`/admin/users/${id}/ban`, { reason });
    return data;
  },

  async unbanUser(id: string): Promise<UserModerationResponse> {
    const { data } = await http.post(`/admin/users/${id}/unban`);
    return data;
  },
  async archiveStaff(id: string): Promise<StaffLifecycleResponse> {
    const { data } = await http.post(`/admin/users/${id}/archive-staff`);
    return data;
  },
  async unarchiveStaff(id: string): Promise<StaffLifecycleResponse> {
    const { data } = await http.post(`/admin/users/${id}/unarchive-staff`);
    return data;
  },
  async deleteStaff(id: string): Promise<void> {
    await http.delete(`/admin/users/${id}/staff`);
  },
  async provisionStaff(payload: {
    first_name: string;
    last_name: string;
    phone_number: string;
    role: 'ADMIN' | 'FRONTDESK' | 'DRIVER';
  }): Promise<ProvisionStaffResponse> {
    const { data } = await http.post('/admin/users/provision-staff', payload);
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
  async listLatestOrders(params?: {
    status?: string[];
    order_type?: 'pickup' | 'delivery';
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<OrderListResponse> {
    const { data } = await http.get('/orders/latest', { params });
    return data;
  },
  async assignDriverToOrder(orderId: string, driverUserId: string) {
    const { data } = await http.post(`/orders/${orderId}/assign-driver`, { driver_user_id: driverUserId });
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
  async getDashboardAnalytics(): Promise<AdminDashboardAnalyticsResponse> {
    const { data } = await http.get('/admin/analytics/dashboard');
    return data;
  },
  async listRatings(limit = 10, offset = 0): Promise<AdminRatingsResponse> {
    const { data } = await http.get('/admin/ratings', { params: { limit, offset } });
    return data;
  },
  async getRatingsSummary(): Promise<AdminRatingSummaryResponse> {
    const { data } = await http.get('/admin/ratings/summary');
    return data;
  },
};
