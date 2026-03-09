import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useAppTranslation } from '@/hooks/useAppTranslation';
import { theme } from '@/theme';

import { AppText } from './AppText';
import { AdminTabParamList, MainTabParamList } from '@/navigation/types';

const iconByRoute = {
  Home: 'home-outline',
  PastOrders: 'time-outline',
  Profile: 'person-outline',
  AdminDashboard: 'grid-outline',
  AdminMenu: 'restaurant-outline',
  AdminPromotions: 'pricetag-outline',
  AdminLoyalty: 'gift-outline',
  AdminScheduling: 'calendar-outline',
  AdminUsers: 'people-outline',
  AdminProfile: 'person-circle-outline',
} as const;

const iconByRouteFocused = {
  Home: 'home',
  PastOrders: 'time',
  Profile: 'person',
  AdminDashboard: 'grid',
  AdminMenu: 'restaurant',
  AdminPromotions: 'pricetag',
  AdminLoyalty: 'gift',
  AdminScheduling: 'calendar',
  AdminUsers: 'people',
  AdminProfile: 'person-circle',
} as const;

export const BottomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { t } = useAppTranslation();

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {state.routes.map((route, index) => {
          const routeName = route.name as keyof (MainTabParamList & AdminTabParamList);
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const defaultLabel =
            routeName === 'Home'
              ? t('tabs.home')
              : routeName === 'PastOrders'
                ? t('tabs.orders')
                : routeName === 'Profile'
                  ? t('tabs.profile')
                  : options.title?.toString() ?? route.name;
          const label = options.tabBarLabel?.toString() ?? defaultLabel;

          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={[styles.item, focused ? styles.activeItem : null]}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}>
              <Ionicons
                name={focused ? iconByRouteFocused[routeName] : iconByRoute[routeName]}
                size={theme.iconSizes.lg}
                color={focused ? theme.colors.primary600 : theme.colors.textSecondary}
              />
              <AppText
                variant="caption"
                numberOfLines={1}
                style={{ color: focused ? theme.colors.primary700 : theme.colors.textSecondary }}>
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  item: {
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
    gap: 2,
  },
  activeItem: {
    backgroundColor: theme.colors.secondaryCream,
  },
});
