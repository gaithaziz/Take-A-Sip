import { UUID } from '@/types/menu';

export type Promotion = {
  id: UUID;
  title_en: string;
  title_ar: string;
  type: string;
  value: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

export type PromotionsResponse = {
  promotions: Promotion[];
};

export type LoyaltyRule = {
  id: UUID;
  required_orders: number;
  reward_type: string;
  reward_value: string;
  is_active: boolean;
};

export type LoyaltyRulesResponse = {
  rules: LoyaltyRule[];
};

