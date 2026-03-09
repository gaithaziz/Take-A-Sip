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

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
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
};

export type ActivePromotionsResponse = {
  promotions: Promotion[];
};

export type CreateOrderPayload = {
  order_type: 'pickup' | 'delivery';
  delivery_address?: string;
  notes?: string;
  items: Array<{
    size_id: string;
    quantity: number;
    addon_ids: string[];
  }>;
};

export type OrderItemAddonRead = {
  id: string;
  addon_name_snapshot: string;
  price_snapshot: string;
};

export type OrderItemRead = {
  id: string;
  item_name_snapshot: string;
  size_snapshot: string;
  price_snapshot: string;
  quantity: number;
  addons: OrderItemAddonRead[];
};

export type OrderRead = {
  id: string;
  order_number: number;
  user_id: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  delivery_address?: string | null;
  status: 'NEW' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED';
  order_type: 'pickup' | 'delivery';
  created_at: string;
  notes: string | null;
  items: OrderItemRead[];
};

export type OrderListResponse = {
  orders: OrderRead[];
};

export type MenuEntityType = 'section' | 'item' | 'type' | 'size' | 'addon';

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

export type RevenueSummaryResponse = {
  today_revenue: string;
  week_revenue: string;
  month_revenue: string;
  today_orders: number;
  week_orders: number;
  month_orders: number;
};
