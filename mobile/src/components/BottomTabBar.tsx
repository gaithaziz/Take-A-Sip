import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTranslation } from '@/hooks/useAppTranslation';
import { theme } from '@/theme';

import { AppText } from './AppText';
import { MainTabParamList } from '@/navigation/types';

const iconByRoute = {
  Home: 'home-outline',
  PastOrders: 'time-outline',
  Profile: 'person-outline',
} as const;

const iconByRouteFocused = {
  Home: 'home',
  PastOrders: 'time',
  Profile: 'person',
} as const;

export const BottomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { t } = useAppTranslation();

  return (
    <View style={styles.wrapper}>
      {state.routes.map((route, index) => {
        const routeName = route.name as keyof MainTabParamList;
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const label =
          routeName === 'Home'
            ? t('tabs.home')
            : routeName === 'PastOrders'
              ? t('tabs.orders')
              : t('tabs.profile');

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
              style={{ color: focused ? theme.colors.primary700 : theme.colors.textSecondary }}>
              {options.tabBarLabel?.toString() ?? label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    gap: 2,
  },
  activeItem: {
    backgroundColor: theme.colors.secondaryCream,
  },
});
