import { NavigatorScreenParams } from '@react-navigation/native';

import { Item, UserSummary } from '@/types/api';

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
  Auth: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  AdminTabs: NavigatorScreenParams<AdminTabParamList>;
  DriverTabs: NavigatorScreenParams<DriverTabParamList>;
  AdminLoyalty: undefined;
  AdminProfile: undefined;
  AdminUserDetails: { user: UserSummary };
  DriverOrderDetails: { orderId: string };
  ClientOrderDetails: { orderId: string };
  ProductDetails: { item: Item };
  Cart: undefined;
  Checkout: undefined;
};
