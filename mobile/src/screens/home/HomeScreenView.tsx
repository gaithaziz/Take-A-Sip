import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, SectionList, StyleSheet, View, ViewToken, useWindowDimensions } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { OfferRibbon } from '@/components/OfferRibbon';
import { ProductCard } from '@/components/ProductCard';
import { HomeProductListSkeleton } from '@/components/skeleton/HomeProductListSkeleton';
import { theme } from '@/theme';
import { Item, Promotion } from '@/types/api';
import { mirroredRow } from '@/utils/layout';

import { HomeMenuSection } from './types';

type HomeScreenViewProps = {
  menuSections: HomeMenuSection[];
  offers: Promotion[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  cartCount: number;
  isRTL: boolean;
  topInset: number;
  bottomInset: number;
  t: (key: string) => string;
  onReload: () => void;
  onOpenCart: () => void;
  onOpenProduct: (item: Item) => void;
};

export const HomeScreenView = ({
  menuSections,
  offers,
  loading,
  refreshing,
  error,
  cartCount,
  isRTL,
  topInset,
  bottomInset,
  t,
  onReload,
  onOpenCart,
  onOpenProduct,
}: HomeScreenViewProps) => {
  const { width } = useWindowDimensions();
  const listRef = useRef<SectionList<Item, HomeMenuSection>>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const isCompact = width < 390;

  const visibleSections = useMemo(() => menuSections.filter((section) => section.data.length > 0), [menuSections]);
  const sectionIndexById = useMemo(
    () => Object.fromEntries(visibleSections.map((section, index) => [section.id, index])),
    [visibleSections],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken<Item>> }) => {
      const firstItem = viewableItems.find((item) => item.isViewable && item.section?.id);
      if (firstItem?.section?.id) {
        setActiveSectionId(firstItem.section.id);
      }
    },
  );
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 45 });

  const scrollToSection = useCallback(
    (sectionId: string) => {
      const sectionIndex = sectionIndexById[sectionId];
      if (sectionIndex === undefined) {
        return;
      }
      listRef.current?.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        viewPosition: 0,
        viewOffset: 8,
        animated: true,
      });
      setActiveSectionId(sectionId);
    },
    [sectionIndexById],
  );

  return (
    <SectionList
      ref={listRef}
      sections={visibleSections}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ProductCard item={item} onPress={() => onOpenProduct(item)} />}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeaderWrap}>
          <View style={[styles.sectionTitleRow, mirroredRow(isRTL)]}>
            <AppText variant="h2">{section.title}</AppText>
            <View style={styles.sectionCountWrap}>
              <AppText variant="caption" color={theme.colors.primary700} align="center">
                {section.data.length}
              </AppText>
            </View>
          </View>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
      SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <AppCard style={styles.topPanel}>
            <View style={[styles.topBar, mirroredRow(isRTL), isCompact ? styles.topBarCompact : null]}>
              <View style={[styles.topTitleWrap, mirroredRow(isRTL)]}>
                <View style={styles.logoWrap}>
                  <Image source={require('../../../assets/logo.png')} style={styles.logo} resizeMode="cover" />
                </View>
                <View style={styles.titleTextWrap}>
                  <AppText variant="h3" color={theme.colors.primary700} align={isRTL ? 'right' : 'left'}>
                    {t('common.appName')}
                  </AppText>
                  <AppText variant="h1" align={isRTL ? 'right' : 'left'}>
                    {t('home.title')}
                  </AppText>
                </View>
              </View>
              <Pressable
                style={[styles.cartButton, mirroredRow(isRTL), isCompact ? styles.cartButtonCompact : null]}
                onPress={onOpenCart}
                accessibilityRole="button"
                accessibilityLabel={`${t('home.cart')} (${cartCount})`}
                hitSlop={8}>
                <View style={styles.cartIconWrap}>
                  <Ionicons name="bag-handle-outline" size={18} color={theme.colors.primary700} />
                </View>
                <View style={[styles.cartMetaRow, mirroredRow(isRTL)]}>
                  <AppText variant="caption" color={theme.colors.textSecondary}>
                    {t('home.cart')}
                  </AppText>
                  <View style={styles.cartCountBadge}>
                    <AppText variant="caption" color={theme.colors.white} align="center">
                      {cartCount.toString()}
                    </AppText>
                  </View>
                </View>
              </Pressable>
            </View>
          </AppCard>

          {offers.length > 0 ? (
            <View style={styles.ribbonWrap}>
              <OfferRibbon offers={offers} />
            </View>
          ) : null}

          {visibleSections.length > 0 ? (
            <View style={styles.chipsWrap}>
              <AppText variant="caption" color={theme.colors.textSecondary}>
                {t('home.jumpToCategory')}
              </AppText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={isRTL ? styles.rtlScroll : null}
                contentContainerStyle={[styles.chipsContent, mirroredRow(isRTL)]}>
                {visibleSections.map((section) => {
                  const selected = (activeSectionId ?? visibleSections[0]?.id) === section.id;
                  return (
                    <Pressable
                      key={section.id}
                      onPress={() => scrollToSection(section.id)}
                      style={[
                        styles.categoryChip,
                        isRTL ? styles.rtlChip : null,
                        selected ? styles.categoryChipActive : null,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={section.title}>
                      <AppText
                        variant="caption"
                        color={selected ? theme.colors.primary700 : theme.colors.textSecondary}
                        numberOfLines={1}>
                        {section.title}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        loading && visibleSections.length === 0 ? (
          <View style={styles.stateWrap}>
            <HomeProductListSkeleton isRTL={isRTL} />
          </View>
        ) : error && visibleSections.length === 0 ? (
          <View style={styles.stateWrap}>
            <EmptyState title={t('common.retry')} subtitle={error} actionLabel={t('common.retry')} onAction={onReload} />
          </View>
        ) : (
          <View style={styles.stateWrap}>
            <EmptyState title={t('home.noMenu')} subtitle={t('home.noMenu')} />
          </View>
        )
      }
      showsVerticalScrollIndicator={false}
      onRefresh={onReload}
      refreshing={refreshing}
      onViewableItemsChanged={onViewableItemsChanged.current}
      viewabilityConfig={viewabilityConfig.current}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topInset + theme.spacing.md,
          paddingBottom: bottomInset + theme.spacing.xl,
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
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  topPanel: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.primary100,
  },
  topBar: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  topBarCompact: {
    alignItems: 'stretch',
  },
  topTitleWrap: {
    flex: 1,
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  logoWrap: {
    width: 68,
    height: 68,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.primary200,
    backgroundColor: theme.colors.surface,
    ...theme.shadows.card,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  titleTextWrap: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  cartButton: {
    minHeight: 54,
    minWidth: 0,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary200,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.secondaryCream,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  cartButtonCompact: {
    width: '100%',
    justifyContent: 'center',
  },
  cartIconWrap: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary100,
  },
  cartMetaRow: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  cartCountBadge: {
    minWidth: 24,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary500,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ribbonWrap: {
    marginTop: 0,
  },
  chipsWrap: {
    marginTop: 0,
  },
  chipsContent: {
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.sm,
  },
  rtlScroll: {
    transform: [{ scaleX: -1 }],
  },
  categoryChip: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  rtlChip: {
    transform: [{ scaleX: -1 }],
  },
  categoryChipActive: {
    borderColor: theme.colors.primary200,
    backgroundColor: theme.colors.primary50,
    ...theme.shadows.card,
  },
  sectionHeaderWrap: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  sectionTitleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionCountWrap: {
    minWidth: 30,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.primary100,
    backgroundColor: theme.colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemSeparator: {
    height: theme.spacing.sm,
  },
  sectionSeparator: {
    height: theme.spacing.md,
  },
  stateWrap: {
    paddingVertical: theme.spacing.lg,
  },
});
