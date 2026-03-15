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
  delivery_address_text?: string | null;
  delivery_latitude?: string | null;
  delivery_longitude?: string | null;
  assigned_driver_id?: string | null;
  assigned_driver_name?: string | null;
  assigned_driver_phone?: string | null;
  status: 'NEW' | 'ACCEPTED' | 'ASSIGNED' | 'OUT_FOR_DELIVERY' | 'COMPLETED' | 'CANCELLED';
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
