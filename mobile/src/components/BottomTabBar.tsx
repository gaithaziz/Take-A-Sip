import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { mirroredRow } from '@/utils/layout';

import { AppText } from './AppText';
import { AdminTabParamList, DriverTabParamList, MainTabParamList } from '@/navigation/types';

const iconByRoute = {
  Home: 'home-outline',
  PastOrders: 'time-outline',
  Profile: 'person-outline',
  AdminDashboard: 'grid-outline',
  AdminMenu: 'restaurant-outline',
  AdminPromotions: 'pricetag-outline',
  AdminScheduling: 'calendar-outline',
  AdminStaff: 'person-add-outline',
  AdminUsers: 'people-outline',
  AdminDelivery: 'car-outline',
  DriverOrders: 'bicycle-outline',
  DriverProfile: 'person-outline',
} as const;

const iconByRouteFocused = {
  Home: 'home',
  PastOrders: 'time',
  Profile: 'person',
  AdminDashboard: 'grid',
  AdminMenu: 'restaurant',
  AdminPromotions: 'pricetag',
  AdminScheduling: 'calendar',
  AdminStaff: 'person-add',
  AdminUsers: 'people',
  AdminDelivery: 'car',
  DriverOrders: 'bicycle',
  DriverProfile: 'person',
} as const;

export const BottomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { t } = useAppTranslation();
  const { isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const compactLayout = state.routes.length <= 5;

  const items = state.routes.map((route, index) => {
    const routeName = route.name as keyof (MainTabParamList & AdminTabParamList & DriverTabParamList);
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
        style={[styles.item, compactLayout ? styles.compactItem : null, focused ? styles.activeItem : null]}
        accessibilityRole="tab"
        accessibilityLabel={label}
        accessibilityState={focused ? { selected: true } : {}}
        hitSlop={6}>
          <Ionicons
            name={focused ? iconByRouteFocused[routeName] : iconByRoute[routeName]}
            size={theme.iconSizes.lg}
            color={focused ? theme.colors.primary500 : theme.colors.textSecondary}
          />
        <AppText
          variant="caption"
          numberOfLines={1}
          style={{ color: focused ? theme.colors.primary700 : theme.colors.textSecondary }}>
          {label}
        </AppText>
      </Pressable>
    );
  });

  const wrapperStyle = [styles.wrapper, { paddingBottom: Math.max(insets.bottom, theme.spacing.sm) }];

  if (compactLayout) {
    return (
      <View style={wrapperStyle}>
        <View style={[styles.compactContent, mirroredRow(isRTL)]}>{items}</View>
      </View>
    );
  }

  return (
    <View style={wrapperStyle}>
      <View style={[styles.overflowHintRow, mirroredRow(isRTL)]}>
        <Ionicons
          name={isRTL ? 'chevron-forward' : 'chevron-back'}
          size={theme.iconSizes.sm}
          color={theme.colors.textMuted}
        />
        <AppText variant="caption" color={theme.colors.textSecondary} align="center">
          {t('tabs.swipeForMore')}
        </AppText>
        <Ionicons
          name={isRTL ? 'chevron-back' : 'chevron-forward'}
          size={theme.iconSizes.sm}
          color={theme.colors.textMuted}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {items}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    ...theme.shadows.floating,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  overflowHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  item: {
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    gap: 4,
  },
  compactItem: {
    flex: 1,
    minWidth: 0,
  },
  activeItem: {
    backgroundColor: theme.colors.primary50,
    borderWidth: 1,
    borderColor: theme.colors.primary100,
    ...theme.shadows.card,
  },
});
