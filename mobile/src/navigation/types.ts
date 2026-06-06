import { NavigatorScreenParams } from '@react-navigation/native';

import { Item, LanguageCode, MenuSchedule, Promotion, Section, UserSummary } from '@/types/api';

export type MainTabParamList = {
  Home: undefined;
  PastOrders: undefined;
  Profile: undefined;
};

export type DriverTabParamList = {
  DriverOrders: undefined;
  DriverProfile: undefined;
};

export type AdminTabParamList = {
  AdminDashboard: undefined;
  AdminMenu: undefined;
  AdminPromotions: undefined;
  AdminScheduling: undefined;
  AdminStaff: undefined;
  AdminUsers: undefined;
  AdminDelivery: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  Auth: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  AdminTabs: NavigatorScreenParams<AdminTabParamList>;
  AdminOrders: undefined;
  AdminReviews: undefined;
  DriverTabs: NavigatorScreenParams<DriverTabParamList>;
  AdminLoyalty: undefined;
  AdminProfile: undefined;
  AdminMenuCategoryEditor: { section?: Section } | undefined;
  AdminMenuProductEditor: { item?: Item; sectionId?: string } | undefined;
  AdminMenuCustomerPreview: { item: Item; initialLanguage?: LanguageCode };
  AdminPromotionEditor: { promotion?: Promotion } | undefined;
  AdminScheduleEditor: { schedule?: MenuSchedule } | undefined;
  AdminWholeMenuPreview:
    | {
        draftPromotion?: Promotion;
        draftSchedules?: MenuSchedule[];
        initialLanguage?: LanguageCode;
      }
    | undefined;
  AdminUserDetails: { user: UserSummary };
  DriverOrderDetails: { orderId: string };
  ClientOrderDetails: { orderId: string };
  ProductDetails: { item: Item };
  Cart: undefined;
  Checkout: undefined;
};
