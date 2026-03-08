import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppShell } from '@/components/AppShell';
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

export const HomeScreen = ({ navigation }: Props) => {
  const { t, language } = useAppTranslation();
  const { items: cartItems } = useCart();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [offers, setOffers] = useState<Promotion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [menu, activePromotions] = await Promise.all([menuService.getMenu(), promotionService.getActive()]);
      setSections(menu.sections.filter((section) => section.is_active));
      setOffers(activePromotions.promotions.filter((offer) => offer.is_active));
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const cartCount = useMemo(
    () => cartItems.reduce((sum, cartItem) => sum + cartItem.quantity, 0),
    [cartItems],
  );

  const openProduct = (item: Item) => {
    navigation.getParent()?.navigate('ProductDetails', { item });
  };

  return (
    <AppShell refreshing={loading} onRefresh={loadData}>
      <View style={styles.header}>
        <AppText variant="h1">{t('home.title')}</AppText>
        <Pressable style={styles.cartButton} onPress={() => navigation.getParent()?.navigate('Cart')}>
          <Ionicons name="bag-handle-outline" size={20} color={theme.colors.primary700} />
          <AppText variant="caption">{`${t('home.cart')} (${cartCount})`}</AppText>
        </Pressable>
      </View>

      {offers.length > 0 ? <OfferRibbon offers={offers} /> : null}

      {loading ? <LoadingState label={t('common.loading')} /> : null}

      {!loading && error ? (
        <EmptyState title={t('common.retry')} subtitle={error} actionLabel={t('common.retry')} onAction={loadData} />
      ) : null}

      {!loading && !error && sections.length === 0 ? (
        <EmptyState title={t('home.noMenu')} subtitle={t('home.noMenu')} />
      ) : null}

      {!loading &&
        !error &&
        sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <AppText variant="h2">{getLocalizedValue(section, language, 'name')}</AppText>
            <View style={styles.sectionItems}>
              {section.items
                .filter((item) => item.is_active)
                .map((item) => (
                  <ProductCard key={item.id} item={item} onPress={() => openProduct(item)} />
                ))}
            </View>
          </View>
        ))}
    </AppShell>
  );
};

const styles = StyleSheet.create({
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
  section: {
    gap: theme.spacing.md,
  },
  sectionItems: {
    gap: theme.spacing.md,
  },
});
