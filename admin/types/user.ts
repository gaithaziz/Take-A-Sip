import { UUID } from '@/types/menu';

export type User = {
  id: UUID;
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

export type UsersResponse = {
  users: User[];
};

export type BanRequest = {
  reason?: string;
};

export type ModerationResponse = {
  id: UUID;
  is_banned: boolean;
  banned_reason: string | null;
};

