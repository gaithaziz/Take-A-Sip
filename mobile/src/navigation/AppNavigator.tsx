import { NavigationContainer, Theme, createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomTabBar } from '@/components/BottomTabBar';
import { WelcomeSplash } from '@/components/WelcomeSplash';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { notificationService } from '@/services/notificationService';
import { useAuth } from '@/state/AuthContext';
import { theme } from '@/theme';
import { PushNotificationPayload } from '@/types/api';

import { AuthScreen } from '@/screens/AuthScreen';
import { CartScreen } from '@/screens/CartScreen';
import { CheckoutScreen } from '@/screens/CheckoutScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { PastOrdersScreen } from '@/screens/PastOrdersScreen';
import { ProductDetailsScreen } from '@/screens/ProductDetailsScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { WelcomeScreen } from '@/screens/WelcomeScreen';
import { AdminDashboardScreen } from '@/screens/admin/AdminDashboardScreen';
import { AdminMenuEditorScreen } from '@/screens/admin/AdminMenuEditorScreen';
import { AdminMenuCategoryEditorScreen } from '@/screens/admin/AdminMenuCategoryEditorScreen';
import { AdminMenuCustomerPreviewScreen } from '@/screens/admin/AdminMenuCustomerPreviewScreen';
import { AdminMenuProductEditorScreen } from '@/screens/admin/AdminMenuProductEditorScreen';
import { AdminPromotionsScreen } from '@/screens/admin/AdminPromotionsScreen';
import { AdminPromotionEditorScreen } from '@/screens/admin/AdminPromotionEditorScreen';
import { AdminLoyaltyRulesScreen } from '@/screens/admin/AdminLoyaltyRulesScreen';
import { AdminSchedulingScreen } from '@/screens/admin/AdminSchedulingScreen';
import { AdminScheduleEditorScreen } from '@/screens/admin/AdminScheduleEditorScreen';
import { AdminWholeMenuPreviewScreen } from '@/screens/admin/AdminWholeMenuPreviewScreen';
import { AdminStaffScreen } from '@/screens/admin/AdminStaffScreen';
import { AdminUsersScreen } from '@/screens/admin/AdminUsersScreen';
import { AdminProfileScreen } from '@/screens/admin/AdminProfileScreen';
import { AdminOrdersScreen } from '@/screens/admin/AdminOrdersScreen';
import { AdminReviewsScreen } from '@/screens/admin/AdminReviewsScreen';
import { AdminUserDetailsScreen } from '@/screens/admin/AdminUserDetailsScreen';
import { AdminDeliveryScreen } from '@/screens/admin/AdminDeliveryScreen';
import { DriverOrdersScreen } from '@/screens/driver/DriverOrdersScreen';
import { DriverProfileScreen } from '@/screens/driver/DriverProfileScreen';
import { DriverOrderDetailsScreen } from '@/screens/driver/DriverOrderDetailsScreen';
import { ClientOrderDetailsScreen } from '@/screens/ClientOrderDetailsScreen';

import { AdminTabParamList, DriverTabParamList, MainTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();
const AdminTabsNavigator = createBottomTabNavigator<AdminTabParamList>();
const DriverTabsNavigator = createBottomTabNavigator<DriverTabParamList>();
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const navTheme: Theme = {
  dark: false,
  colors: {
    primary: theme.colors.primary500,
    background: theme.colors.background,
    card: theme.colors.surface,
    text: theme.colors.textPrimary,
    border: theme.colors.border,
    notification: theme.colors.warning,
  },
  fonts: {
    regular: {
      fontFamily: 'System',
      fontWeight: '400',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    bold: {
      fontFamily: 'System',
      fontWeight: '700',
    },
    heavy: {
      fontFamily: 'System',
      fontWeight: '800',
    },
  },
};

const MainTabs = () => {
  const { t } = useAppTranslation();
  return (
    <Tabs.Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false, lazy: true }}>
      <Tabs.Screen name="Home" component={HomeScreen} options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="PastOrders" component={PastOrdersScreen} options={{ title: t('tabs.orders') }} />
      <Tabs.Screen name="Profile" component={ProfileScreen} options={{ title: t('tabs.profile') }} />
    </Tabs.Navigator>
  );
};

const AdminTabs = () => {
  const { t } = useAppTranslation();
  return (
    <AdminTabsNavigator.Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false, lazy: true }}>
      <AdminTabsNavigator.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{ title: t('tabs.adminDashboard') }}
      />
      <AdminTabsNavigator.Screen
        name="AdminMenu"
        component={AdminMenuEditorScreen}
        options={{ title: t('tabs.adminMenu') }}
      />
      <AdminTabsNavigator.Screen
        name="AdminPromotions"
        component={AdminPromotionsScreen}
        options={{ title: t('tabs.adminPromotions') }}
      />
      <AdminTabsNavigator.Screen
        name="AdminScheduling"
        component={AdminSchedulingScreen}
        options={{ title: t('tabs.adminScheduling') }}
      />
      <AdminTabsNavigator.Screen
        name="AdminStaff"
        component={AdminStaffScreen}
        options={{ title: t('tabs.adminStaff') }}
      />
      <AdminTabsNavigator.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
        options={{ title: t('tabs.adminUsers') }}
      />
      <AdminTabsNavigator.Screen
        name="AdminDelivery"
        component={AdminDeliveryScreen}
        options={{ title: t('tabs.adminDelivery') }}
      />
    </AdminTabsNavigator.Navigator>
  );
};

const DriverTabs = () => {
  const { t } = useAppTranslation();
  return (
    <DriverTabsNavigator.Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false, lazy: true }}>
      <DriverTabsNavigator.Screen
        name="DriverOrders"
        component={DriverOrdersScreen}
        options={{ title: t('tabs.driverOrders') }}
      />
      <DriverTabsNavigator.Screen
        name="DriverProfile"
        component={DriverProfileScreen}
        options={{ title: t('tabs.driverProfile') }}
      />
    </DriverTabsNavigator.Navigator>
  );
};

export const AppNavigator = () => {
  const { t } = useAppTranslation();
  const { token, user, isLoading } = useAuth();
  const initialSignedInRoute =
    user?.role === 'ADMIN' ? 'AdminTabs' : user?.role === 'DRIVER' ? 'DriverTabs' : 'MainTabs';

  useEffect(() => {
    if (!token || !user) {
      return;
    }

    return notificationService.subscribeToNotificationResponses((payload: PushNotificationPayload) => {
      if (!navigationRef.isReady() || payload.role_target !== user.role) {
        return;
      }

      if (user.role === 'CLIENT') {
        if (payload.type === 'promotion_created') {
          navigationRef.navigate('MainTabs', { screen: 'Home' });
          return;
        }
        if (!payload.order_id) {
          return;
        }
        navigationRef.navigate('ClientOrderDetails', { orderId: payload.order_id });
        return;
      }

      if (user.role === 'DRIVER') {
        if (!payload.order_id) {
          return;
        }
        navigationRef.navigate('DriverOrderDetails', { orderId: payload.order_id });
        return;
      }

      if (user.role === 'ADMIN') {
        navigationRef.navigate('AdminTabs', { screen: 'AdminDashboard' });
      }
    });
  }, [token, user]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <WelcomeSplash arabicGreeting={t('welcome.arabicGreeting')} englishGreeting={t('welcome.englishGreeting')} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Welcome">
          {(props) => (
            <WelcomeScreen
              {...props}
              targetRoute={token ? initialSignedInRoute : 'Auth'}
            />
          )}
        </Stack.Screen>
        {!token ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : user?.role === 'ADMIN' ? (
          <>
            <Stack.Screen name="AdminTabs" component={AdminTabs} />
            <Stack.Screen name="AdminOrders" component={AdminOrdersScreen} />
            <Stack.Screen name="AdminReviews" component={AdminReviewsScreen} />
            <Stack.Screen name="AdminLoyalty" component={AdminLoyaltyRulesScreen} />
            <Stack.Screen name="AdminProfile" component={AdminProfileScreen} />
            <Stack.Screen name="AdminMenuCategoryEditor" component={AdminMenuCategoryEditorScreen} />
            <Stack.Screen name="AdminMenuProductEditor" component={AdminMenuProductEditorScreen} />
            <Stack.Screen name="AdminMenuCustomerPreview" component={AdminMenuCustomerPreviewScreen} />
            <Stack.Screen name="AdminPromotionEditor" component={AdminPromotionEditorScreen} />
            <Stack.Screen name="AdminScheduleEditor" component={AdminScheduleEditorScreen} />
            <Stack.Screen name="AdminWholeMenuPreview" component={AdminWholeMenuPreviewScreen} />
            <Stack.Screen name="AdminUserDetails" component={AdminUserDetailsScreen} />
          </>
        ) : user?.role === 'DRIVER' ? (
          <>
            <Stack.Screen name="DriverTabs" component={DriverTabs} />
            <Stack.Screen name="DriverOrderDetails" component={DriverOrderDetailsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="ClientOrderDetails" component={ClientOrderDetailsScreen} />
            <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
            <Stack.Screen name="Cart" component={CartScreen} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
});
