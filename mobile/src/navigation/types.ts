import { NavigatorScreenParams } from '@react-navigation/native';

import { Item, UserSummary } from '@/types/api';

export type MainTabParamList = {
  Home: undefined;
  PastOrders: undefined;
  Profile: undefined;
};

export type AdminTabParamList = {
  AdminDashboard: undefined;
  AdminMenu: undefined;
  AdminPromotions: undefined;
  AdminLoyalty: undefined;
  AdminScheduling: undefined;
  AdminUsers: undefined;
  AdminProfile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  AdminTabs: NavigatorScreenParams<AdminTabParamList>;
  AdminUserDetails: { user: UserSummary };
  ProductDetails: { item: Item };
  Cart: undefined;
  Checkout: undefined;
};
