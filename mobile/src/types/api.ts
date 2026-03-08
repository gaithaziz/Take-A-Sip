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
  is_active: boolean;
};

export type Size = {
  id: string;
  type_id: string;
  name_en: string;
  name_ar: string;
  image_url: string | null;
  price: string;
  is_active: boolean;
  addons: Addon[];
};

export type ItemType = {
  id: string;
  item_id: string;
  name_en: string;
  name_ar: string;
  image_url: string | null;
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
  status: 'NEW' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED';
  order_type: 'pickup' | 'delivery';
  created_at: string;
  notes: string | null;
  items: OrderItemRead[];
};

export type OrderListResponse = {
  orders: OrderRead[];
};
