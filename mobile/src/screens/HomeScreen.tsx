import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { OfferRibbon } from '@/components/OfferRibbon';
import { ProductCard } from '@/components/ProductCard';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { MainTabParamList } from '@/navigation/types';
import { menuService } from '@/services/menuService';
import { promotionService } from '@/services/promotionService';
import { useCart } from '@/state/CartContext';
import { theme } from '@/theme';
import { Item, Promotion, Section } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { getLocalizedValue } from '@/utils/i18n';

type Props = BottomTabScreenProps<MainTabParamList, 'Home'>;
type MenuSection = { id: string; title: string; data: Item[] };

export const HomeScreen = ({ navigation }: Props) => {
  const { t, language } = useAppTranslation();
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
  const menuSections = useMemo<MenuSection[]>(
    () =>
      sections.map((section) => ({
        id: section.id,
        title: getLocalizedValue(section, language, 'name'),
        data: section.items.filter((item) => item.is_active),
      })),
    [language, sections],
  );

  const openProduct = (item: Item) => {
    navigation.getParent()?.navigate('ProductDetails', { item });
  };

  return (
    <SectionList
      sections={menuSections}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ProductCard item={item} onPress={() => openProduct(item)} />}
      renderSectionHeader={({ section }) =>
        section.data.length > 0 ? (
          <View style={styles.sectionHeaderWrap}>
            <AppText variant="h2">{section.title}</AppText>
          </View>
        ) : null
      }
      ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
      SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <View style={styles.header}>
            <AppText variant="h1">{t('home.title')}</AppText>
            <Pressable
              style={styles.cartButton}
              onPress={() => navigation.getParent()?.navigate('Cart')}
              accessibilityRole="button"
              accessibilityLabel={`${t('home.cart')} (${cartCount})`}
              hitSlop={8}>
              <Ionicons name="bag-handle-outline" size={20} color={theme.colors.primary700} />
              <AppText variant="caption">{`${t('home.cart')} (${cartCount})`}</AppText>
            </Pressable>
          </View>
          {offers.length > 0 ? <OfferRibbon offers={offers} /> : null}
        </View>
      }
      ListEmptyComponent={
        loading && menuSections.length === 0 ? (
          <LoadingState label={t('common.loading')} />
        ) : error && menuSections.length === 0 ? (
          <EmptyState title={t('common.retry')} subtitle={error} actionLabel={t('common.retry')} onAction={loadData} />
        ) : (
          <EmptyState title={t('home.noMenu')} subtitle={t('home.noMenu')} />
        )
      }
      showsVerticalScrollIndicator={false}
      onRefresh={loadData}
      refreshing={refreshing}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + theme.spacing.md,
          paddingBottom: insets.bottom + theme.spacing.xl,
        },
      ]}
      stickySectionHeadersEnabled={false}
    />
  );
};

const styles = StyleSheet.create({
  content: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  headerBlock: {
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  cartButton: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.primary200,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.secondaryCream,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  sectionHeaderWrap: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  itemSeparator: {
    height: theme.spacing.md,
  },
  sectionSeparator: {
    height: theme.spacing.md,
  },
});
