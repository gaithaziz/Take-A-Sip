export type AuthUser = {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: 'CLIENT' | 'ADMIN' | 'FRONTDESK';
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
  status: 'NEW' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED';
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
  event: 'order.created' | 'order.accepted';
  order_id: string;
  order_number: number;
  status: string;
};
