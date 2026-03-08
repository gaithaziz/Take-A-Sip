import { NavigatorScreenParams } from '@react-navigation/native';

import { Item } from '@/types/api';

export type MainTabParamList = {
  Home: undefined;
  PastOrders: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  ProductDetails: { item: Item };
  Cart: undefined;
  Checkout: undefined;
};
