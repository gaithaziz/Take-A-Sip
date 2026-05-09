export type UUID = string;

export type MenuAddon = {
  id: UUID;
  size_id: UUID;
  name_en: string;
  name_ar: string;
  image_url: string | null;
  price: string;
  sort_order: number;
  is_active: boolean;
};

export type MenuSize = {
  id: UUID;
  type_id: UUID;
  name_en: string;
  name_ar: string;
  image_url: string | null;
  price: string;
  order_limit?: number | null;
  sort_order: number;
  is_active: boolean;
  addons: MenuAddon[];
};

export type MenuType = {
  id: UUID;
  item_id: UUID;
  name_en: string;
  name_ar: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  sizes: MenuSize[];
};

export type MenuItem = {
  id: UUID;
  section_id: UUID;
  name_en: string;
  name_ar: string;
  image_url: string | null;
  description_en: string | null;
  description_ar: string | null;
  sort_order: number;
  is_active: boolean;
  item_types: MenuType[];
};

export type MenuSection = {
  id: UUID;
  name_en: string;
  name_ar: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  items: MenuItem[];
};

export type MenuResponse = {
  sections: MenuSection[];
};

export type ToggleResponse = {
  id: UUID;
  is_active: boolean;
};

export type MenuDeleteCounts = {
  sections: number;
  items: number;
  types: number;
  sizes: number;
  addons: number;
  schedules: number;
};

export type MenuDeleteResponse = {
  id: UUID;
  kind: 'section' | 'item' | 'type' | 'size' | 'addon';
  deleted_counts: MenuDeleteCounts;
};

export type ScheduleMenuRequest = {
  entity_type: 'section' | 'item' | 'type' | 'size' | 'addon';
  entity_id: UUID;
  start_time: string;
  end_time: string;
  days_of_week: number[];
};

export type ScheduleMenuResponse = {
  message: string;
  schedule_id: UUID | null;
};

export type MenuSchedule = {
  id: UUID;
  entity_type: 'section' | 'item' | 'type' | 'size' | 'addon';
  entity_id: UUID;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  is_active: boolean;
};

export type ScheduleListResponse = {
  schedules: MenuSchedule[];
};
