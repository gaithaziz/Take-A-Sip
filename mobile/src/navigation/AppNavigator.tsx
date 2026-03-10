import { NavigationContainer, Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';

import { BottomTabBar } from '@/components/BottomTabBar';
import { LoadingState } from '@/components/LoadingState';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useAuth } from '@/state/AuthContext';
import { theme } from '@/theme';

import { AuthScreen } from '@/screens/AuthScreen';
import { CartScreen } from '@/screens/CartScreen';
import { CheckoutScreen } from '@/screens/CheckoutScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { PastOrdersScreen } from '@/screens/PastOrdersScreen';
import { ProductDetailsScreen } from '@/screens/ProductDetailsScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { AdminDashboardScreen } from '@/screens/admin/AdminDashboardScreen';
import { AdminMenuEditorScreen } from '@/screens/admin/AdminMenuEditorScreen';
import { AdminPromotionsScreen } from '@/screens/admin/AdminPromotionsScreen';
import { AdminLoyaltyRulesScreen } from '@/screens/admin/AdminLoyaltyRulesScreen';
import { AdminSchedulingScreen } from '@/screens/admin/AdminSchedulingScreen';
import { AdminUsersScreen } from '@/screens/admin/AdminUsersScreen';
import { AdminProfileScreen } from '@/screens/admin/AdminProfileScreen';
import { AdminUserDetailsScreen } from '@/screens/admin/AdminUserDetailsScreen';

import { AdminTabParamList, MainTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();
const AdminTabsNavigator = createBottomTabNavigator<AdminTabParamList>();

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
        name="AdminUsers"
        component={AdminUsersScreen}
        options={{ title: t('tabs.adminUsers') }}
      />
    </AdminTabsNavigator.Navigator>
  );
};

export const AppNavigator = () => {
  const { token, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingState label="Take A Sip" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : user?.role === 'ADMIN' ? (
          <>
            <Stack.Screen name="AdminTabs" component={AdminTabs} />
            <Stack.Screen name="AdminLoyalty" component={AdminLoyaltyRulesScreen} />
            <Stack.Screen name="AdminProfile" component={AdminProfileScreen} />
            <Stack.Screen name="AdminUserDetails" component={AdminUserDetailsScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
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
