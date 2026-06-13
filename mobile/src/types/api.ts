export type LanguageCode = 'en' | 'ar';

export type AuthUser = {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
};

export type SendOtpPayload = {
  first_name: string;
  last_name: string;
  phone_number: string;
};

export type VerifyOtpPayload = {
  phone_number: string;
  otp_code: string;
  first_name?: string;
  last_name?: string;
};

export type UpdateProfilePayload = {
  first_name: string;
  last_name: string;
};

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: AuthUser;
};

export type PushProvider = 'fcm' | 'apns';
export type PushPlatform = 'android' | 'ios';

export type PushNotificationPayload = {
  type: string;
  order_id?: string;
  promotion_id?: string;
  role_target: 'CLIENT' | 'ADMIN' | 'DRIVER';
  screen?: 'ClientOrderDetails' | 'DriverOrderDetails' | 'AdminTabs' | 'Home';
};

export type RegisterPushTokenPayload = {
  push_token: string;
  platform: PushPlatform;
  push_provider: PushProvider;
  device_id: string;
  language: LanguageCode;
};

export type DeactivatePushTokenPayload = {
  push_token: string;
};

export type Addon = {
  id: string;
  size_id: string;
  name_en: string;
  name_ar: string;
  image_url: string | null;
  price: string;
  sort_order: number;
  is_active: boolean;
};

export type Size = {
  id: string;
  type_id: string;
  name_en: string;
  name_ar: string;
  image_url: string | null;
  price: string;
  order_limit?: number | null;
  sort_order: number;
  is_active: boolean;
  addons: Addon[];
};

export type ItemType = {
  id: string;
  item_id: string;
  name_en: string;
  name_ar: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  sizes: Size[];
};

export type Item = {
  id: string;
  section_id: string;
  name_en: string;
  name_ar: string;
  image_url: string | null;
  description_en: string | null;
  description_ar: string | null;
  sort_order: number;
  is_active: boolean;
  item_types: ItemType[];
};

export type Section = {
  id: string;
  name_en: string;
  name_ar: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  items: Item[];
};

export type MenuResponse = {
  sections: Section[];
};

export type Promotion = {
  id: string;
  title_en: string;
  title_ar: string;
  type: string;
  value: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  required_completed_orders?: number | null;
  buy_quantity?: number | null;
  free_quantity?: number | null;
  free_delivery_mode?: 'FREE_DELIVERY' | 'PERCENTAGE_DISCOUNT' | null;
  free_delivery_discount_percent?: string | null;
  loyalty_rule_id?: string | null;
  targets: PromotionTarget[];
  buy_targets: PromotionTarget[];
  free_targets: PromotionTarget[];
  scope_summary_en: string;
  scope_summary_ar: string;
  eligibility_summary_en: string;
  eligibility_summary_ar: string;
};

export type ActivePromotionsResponse = {
  promotions: Promotion[];
};

export type PromotionTarget = {
  id: string;
  promotion_id: string;
  target_group: PromotionTargetGroup;
  entity_type: MenuEntityType;
  entity_id: string;
  entity_name_en?: string | null;
  entity_name_ar?: string | null;
};

export type PromotionTargetGroup = 'scope' | 'buy' | 'free';

export type PromotionTargetInput = {
  entity_type: MenuEntityType;
  entity_id: string;
};

export type CreateOrderPayload = {
  order_type: 'pickup' | 'delivery';
  delivery_address?: string;
  delivery_address_text?: string;
  delivery_lat?: number;
  delivery_lng?: number;
  notes?: string;
  items: Array<{
    size_id: string;
    quantity: number;
    addon_ids: string[];
  }>;
};

export type DeliveryQuotePayload = {
  delivery_latitude?: number;
  delivery_longitude?: number;
  delivery_lat?: number;
  delivery_lng?: number;
};

export type DeliveryQuoteResponse = {
  delivery_distance_km: string;
  delivery_fee: string;
  delivery_distance_band_id: string;
};

export type OrderItemAddonRead = {
  id: string;
  addon_id_snapshot?: string | null;
  addon_name_snapshot: string;
  price_snapshot: string;
};

export type OrderItemRead = {
  id: string;
  item_id_snapshot?: string | null;
  size_id_snapshot?: string | null;
  item_name_snapshot: string;
  size_snapshot: string;
  price_snapshot: string;
  quantity: number;
  addons: OrderItemAddonRead[];
};

export type OrderRatingRead = {
  id: string;
  order_id: string;
  user_id: string;
  stars: number;
  note?: string | null;
  created_at: string;
};

export type OrderRead = {
  id: string;
  order_number: number;
  user_id: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  delivery_address?: string | null;
  delivery_address_text?: string | null;
  delivery_latitude?: string | null;
  delivery_longitude?: string | null;
  delivery_distance_km?: string | null;
  delivery_fee?: string | null;
  delivery_distance_band_id?: string | null;
  subtotal_amount?: string | null;
  discount_amount?: string | null;
  total_amount?: string | null;
  applied_promotion_id?: string | null;
  applied_promotion_title_en?: string | null;
  applied_promotion_title_ar?: string | null;
  assigned_driver_id?: string | null;
  assigned_driver_name?: string | null;
  assigned_driver_phone?: string | null;
  assigned_at?: string | null;
  completed_at?: string | null;
  google_maps_url?: string | null;
  status: 'NEW' | 'ACCEPTED' | 'ASSIGNED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
  order_type: 'pickup' | 'delivery';
  created_at: string;
  notes: string | null;
  items: OrderItemRead[];
  rating?: OrderRatingRead | null;
};

export type OrderListResponse = {
  orders: OrderRead[];
};

export type MenuEntityType = 'section' | 'item' | 'type' | 'size' | 'addon';

export type MenuDeleteCounts = {
  sections: number;
  items: number;
  types: number;
  sizes: number;
  addons: number;
  schedules: number;
};

export type MenuDeleteResponse = {
  id: string;
  kind: MenuEntityType;
  deleted_counts: MenuDeleteCounts;
};

export type MenuSchedule = {
  id: string;
  entity_type: MenuEntityType;
  entity_id: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  is_active: boolean;
};

export type MenuScheduleListResponse = {
  schedules: MenuSchedule[];
};

export type UsersListResponse = {
  users: UserSummary[];
};

export type UserSummary = {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
  is_active: boolean;
  is_banned: boolean;
  banned_at: string | null;
  banned_reason: string | null;
  order_count: number;
  created_at: string;
};

export type UserModerationResponse = {
  id: string;
  is_banned: boolean;
  banned_reason: string | null;
};

export type StaffLifecycleResponse = {
  id: string;
  role: 'ADMIN' | 'FRONTDESK' | 'DRIVER';
  is_active: boolean;
  is_banned: boolean;
};

export type ProvisionStaffResponse = {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: 'ADMIN' | 'FRONTDESK' | 'DRIVER';
  created: boolean;
};

export type LoyaltyRule = {
  id: string;
  required_orders: number;
  reward_type: string;
  reward_value: string;
  is_active: boolean;
};

export type LoyaltyRuleListResponse = {
  rules: LoyaltyRule[];
};

export type PromotionListResponse = {
  promotions: Promotion[];
};

export type PromotionEvaluationEntry = {
  promotion: Promotion;
  discount: string;
  matched_subtotal: string;
  reason_code?: string | null;
  reason_summary_en?: string | null;
  reason_summary_ar?: string | null;
};

export type PromotionEvaluationResponse = {
  applied_promotion?: Promotion | null;
  free_delivery_promotion?: Promotion | null;
  discount: string;
  free_delivery?: boolean;
  eligible_promotions: PromotionEvaluationEntry[];
  ineligible_promotions: PromotionEvaluationEntry[];
};

export type RevenueSummaryResponse = {
  today_revenue: string;
  week_revenue: string;
  month_revenue: string;
  today_orders: number;
  week_orders: number;
  month_orders: number;
};

export type OrderAnalyticsResponse = {
  total_orders_today: number;
  pickup_orders_today: number;
  delivery_orders_today: number;
  pickup_delivery_ratio: string;
  average_order_value: string;
};

export type DriverDeliveryAnalytics = {
  driver_id: string;
  driver_name: string;
  deliveries_completed_today: number;
};

export type DriverAnalyticsResponse = {
  deliveries_completed_today: number;
  deliveries_per_driver: DriverDeliveryAnalytics[];
};

export type DeliveryDistanceBand = {
  id: string;
  min_distance_km: string;
  max_distance_km: string;
  fee_amount: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type DeliveryDistanceBandListResponse = {
  bands: DeliveryDistanceBand[];
};

export type SubmitOrderRatingPayload = {
  stars: number;
  note?: string;
};

export type AdminRatingReview = {
  order_id: string;
  stars: number;
  note?: string | null;
  customer_name: string;
  created_at: string;
};

export type AdminRatingsResponse = {
  ratings: AdminRatingReview[];
};

export type AdminRatingSummaryResponse = {
  average_rating: number;
  total_ratings: number;
  stars_breakdown: Record<string, number>;
};

export type AdminDashboardAnalyticsResponse = {
  revenue: RevenueSummaryResponse;
  orders: OrderAnalyticsResponse;
  ratings: AdminRatingSummaryResponse;
  drivers: DriverAnalyticsResponse;
};
