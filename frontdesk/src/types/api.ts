export type AuthUser = {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: 'CLIENT' | 'ADMIN' | 'FRONTDESK' | 'DRIVER';
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
  assigned_driver_id?: string | null;
  assigned_driver_name?: string | null;
  assigned_driver_phone?: string | null;
  status:
    | 'NEW'
    | 'ACCEPTED'
    | 'ASSIGNED'
    | 'ASSIGNED_TO_DRIVER'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'COMPLETED'
    | 'CANCELLED';
  order_type: 'pickup' | 'delivery';
  created_at: string;
  notes: string | null;
  items: OrderItemRead[];
};

export type OrderListResponse = {
  orders: OrderRead[];
};

export type AcceptOrderResponse = {
  id: string;
  status: string;
};

export type FrontdeskSocketMessage = {
  event: 'order.created' | 'order.accepted' | 'order.assigned';
  order_id: string;
  order_number: number;
  status: string;
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

export type UsersListResponse = {
  users: UserSummary[];
};
