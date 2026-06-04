import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTranslation } from '@/hooks/useAppTranslation';
import { MainTabParamList } from '@/navigation/types';
import { menuService } from '@/services/menuService';
import { promotionService } from '@/services/promotionService';
import { useCart } from '@/state/CartContext';
import { Item, Promotion, Section } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { getLocalizedValue } from '@/utils/i18n';
import { useLanguage } from '@/state/LanguageContext';

import { HomeScreenView } from './home/HomeScreenView';
import { HomeMenuGroup, HomeMenuSection } from './home/types';

type Props = BottomTabScreenProps<MainTabParamList, 'Home'>;

export const HomeScreen = ({ navigation }: Props) => {
  const { t, language } = useAppTranslation();
  const { isRTL } = useLanguage();
  const { items: cartItems } = useCart();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [offers, setOffers] = useState<Promotion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      if (sections.length === 0) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      const [menuResult, promotionsResult] = await Promise.allSettled([
        menuService.getMenu(),
        promotionService.getActive(),
      ]);

      if (menuResult.status === 'fulfilled') {
        setSections(menuResult.value.sections.filter((section) => section.is_active));
      } else {
        throw menuResult.reason;
      }

      if (promotionsResult.status === 'fulfilled') {
        setOffers(promotionsResult.value.promotions.filter((offer) => offer.is_active));
      } else {
        // Non-blocking: menu should remain visible even if offers fail.
        setOffers([]);
      }
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sections.length, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const cartCount = useMemo(
    () => cartItems.reduce((sum, cartItem) => sum + cartItem.quantity, 0),
    [cartItems],
  );
  const insets = useSafeAreaInsets();
  const buildMenuGroups = useCallback(
    (section: Section, activeItems: Item[]): HomeMenuGroup[] => {
      const groups: HomeMenuGroup[] = [];
      const groupIndexByTitle = new Map<string, number>();

      activeItems.forEach((item) => {
        const rawGroupTitle = getLocalizedValue(item, language, 'description').trim();
        const groupTitle = rawGroupTitle.length > 0 ? rawGroupTitle : null;
        const groupKey = groupTitle ?? '__ungrouped__';
        const existingIndex = groupIndexByTitle.get(groupKey);

        if (existingIndex === undefined) {
          groupIndexByTitle.set(groupKey, groups.length);
          groups.push({
            id: `${section.id}-${groupKey}`,
            title: groupTitle,
            data: [item],
          });
          return;
        }

        groups[existingIndex].data.push(item);
      });

      return groups;
    },
    [language],
  );
  const menuSections = useMemo<HomeMenuSection[]>(
    () =>
      sections.map((section) => {
        const activeItems = section.items.filter((item) => item.is_active);
        return {
          id: section.id,
          title: getLocalizedValue(section, language, 'name'),
          imageUrl: section.image_url,
          data: activeItems,
          groups: buildMenuGroups(section, activeItems),
        };
      }),
    [buildMenuGroups, language, sections],
  );

  const openProduct = (item: Item) => {
    navigation.getParent()?.navigate('ProductDetails', { item });
  };

  return (
    <HomeScreenView
      menuSections={menuSections}
      offers={offers}
      loading={loading}
      refreshing={refreshing}
      error={error}
      cartCount={cartCount}
      isRTL={isRTL}
      topInset={insets.top}
      bottomInset={insets.bottom}
      t={t}
      onReload={loadData}
      onOpenCart={() => navigation.getParent()?.navigate('Cart')}
      onOpenProduct={openProduct}
    />
  );
};
