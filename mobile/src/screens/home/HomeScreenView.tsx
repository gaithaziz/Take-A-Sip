import { Ionicons } from '@expo/vector-icons';
import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  UIManager,
  View,
  useWindowDimensions,
} from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { OfferRibbon } from '@/components/OfferRibbon';
import { OrderingUnavailableNotice } from '@/components/OrderingUnavailableNotice';
import { ProductCard } from '@/components/ProductCard';
import { HomeProductListSkeleton } from '@/components/skeleton/HomeProductListSkeleton';
import { theme } from '@/theme';
import { Item, LanguageCode, Promotion } from '@/types/api';
import { mirroredRow } from '@/utils/layout';

import { HomeMenuSection } from './types';

type HomeScreenViewProps = {
  menuSections: HomeMenuSection[];
  offers: Promotion[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  orderingEnabled: boolean;
  orderingUnavailableMessage: string;
  cartCount: number;
  isRTL: boolean;
  topInset: number;
  bottomInset: number;
  t: (key: string) => string;
  onReload: () => void;
  onOpenCart: () => void;
  onOpenProduct: (item: Item) => void;
  previewLanguage?: LanguageCode;
  previewIsRTL?: boolean;
};

export const HomeScreenView = ({
  menuSections,
  offers,
  loading,
  refreshing,
  error,
  orderingEnabled,
  orderingUnavailableMessage,
  cartCount,
  isRTL,
  topInset,
  bottomInset,
  t,
  onReload,
  onOpenCart,
  onOpenProduct,
  previewLanguage,
  previewIsRTL,
}: HomeScreenViewProps) => {
  const { width } = useWindowDimensions();
  const [expandedSectionIds, setExpandedSectionIds] = useState<string[]>([]);
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);
  const isCompact = width < 390;
  const floatingBottomOffset = theme.spacing.xs;
  const floatingButtonOverlap = 54 + floatingBottomOffset + theme.spacing.sm;

  const visibleSections = useMemo(() => menuSections.filter((section) => section.data.length > 0), [menuSections]);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const toggleSection = (sectionId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSectionIds((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
    );
  };

  const toggleGroup = (groupId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId],
    );
  };

  return (
    <View style={styles.page}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topInset + theme.spacing.md,
            paddingBottom: floatingButtonOverlap,
          },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onReload} tintColor={theme.colors.primary500} />}
        keyboardShouldPersistTaps="handled">
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
                testID="home-cart-button"
                accessibilityRole="button"
                accessibilityLabel={`${t('home.cart')} (${cartCount})`}
                hitSlop={8}>
                <View style={styles.cartIconWrap}>
                  <Ionicons name="bag-handle-outline" size={18} color={theme.colors.primary700} />
                </View>
                <View style={[styles.cartMetaRow, mirroredRow(isRTL)]}>
                  <AppText
                    variant="caption"
                    color={theme.colors.textSecondary}
                    numberOfLines={1}
                    maxFontSizeMultiplier={1}
                    style={styles.cartLabel}>
                    {t('home.cart')}
                  </AppText>
                  <View style={styles.cartCountBadge}>
                    <AppText
                      variant="caption"
                      color={theme.colors.white}
                      align="center"
                      numberOfLines={1}
                      maxFontSizeMultiplier={1}
                      style={styles.cartCountText}>
                      {cartCount.toString()}
                    </AppText>
                  </View>
                </View>
              </Pressable>
            </View>
          </AppCard>

          {!orderingEnabled ? (
            <OrderingUnavailableNotice message={orderingUnavailableMessage} isRTL={isRTL} />
          ) : null}

          {offers.length > 0 ? (
            <View style={styles.ribbonWrap}>
              <OfferRibbon offers={offers} languageOverride={previewLanguage} isRTLOverride={previewIsRTL} />
            </View>
          ) : null}

          {loading && visibleSections.length === 0 ? (
            <View style={styles.stateWrap}>
              <HomeProductListSkeleton isRTL={isRTL} />
            </View>
          ) : error && visibleSections.length === 0 ? (
            <View style={styles.stateWrap}>
              <EmptyState title={t('common.retry')} subtitle={error} actionLabel={t('common.retry')} onAction={onReload} />
            </View>
          ) : visibleSections.length === 0 ? (
            <View style={styles.stateWrap}>
              <EmptyState title={t('home.noMenu')} subtitle={t('home.noMenu')} />
            </View>
          ) : (
            <View style={styles.sectionsWrap}>
              {visibleSections.map((section) => {
                const expanded = expandedSectionIds.includes(section.id);
                return (
                  <View key={section.id} style={styles.sectionBlock}>
                    <Pressable
                      onPress={() => toggleSection(section.id)}
                      testID={`section-row-${section.id}`}
                      accessibilityRole="button"
                      accessibilityState={{ expanded }}
                      accessibilityLabel={section.title}
                      style={({ pressed }) => [
                        styles.sectionRow,
                        expanded ? styles.sectionRowExpanded : null,
                        pressed ? styles.sectionRowPressed : null,
                      ]}>
                      <View style={styles.sectionAccent} />
                      <View style={[styles.sectionTitleRow, mirroredRow(isRTL)]}>
                        <View style={[styles.sectionLeadingWrap, mirroredRow(isRTL)]}>
                          <View style={styles.sectionThumbnailFrame}>
                            {section.imageUrl ? (
                              <Image source={{ uri: section.imageUrl }} style={styles.sectionThumbnail} resizeMode="cover" />
                            ) : (
                              <View style={styles.sectionThumbnailPlaceholder}>
                                <Ionicons name="cafe-outline" size={22} color={theme.colors.primary700} />
                              </View>
                            )}
                          </View>
                          <View style={styles.sectionTitleContent}>
                            <AppText variant="h3">{section.title}</AppText>
                          </View>
                        </View>
                        <View style={[styles.sectionMetaWrap, mirroredRow(isRTL)]}>
                          <View style={[styles.sectionCountWrap, expanded ? styles.sectionCountWrapExpanded : null]}>
                            <AppText variant="caption" color={theme.colors.primary700} align="center">
                              {section.data.length}
                            </AppText>
                          </View>
                          <View style={[styles.chevronWrap, expanded ? styles.chevronWrapExpanded : null]}>
                            <Ionicons
                              name={expanded ? 'chevron-up' : 'chevron-down'}
                              size={18}
                              color={theme.colors.primary700}
                            />
                          </View>
                        </View>
                      </View>
                    </Pressable>

                    {expanded ? (
                      <View style={styles.expandedItemsWrap}>
                        {section.groups.map((group, groupIndex) => {
                          const groupExpanded = group.title ? expandedGroupIds.includes(group.id) : true;

                          return (
                            <View key={group.id} style={styles.subgroupBlock}>
                              {group.title ? (
                                <Pressable
                                  onPress={() => toggleGroup(group.id)}
                                  testID={`subgroup-row-${group.id}`}
                                  accessibilityRole="button"
                                  accessibilityState={{ expanded: groupExpanded }}
                                  accessibilityLabel={group.title}
                                  style={({ pressed }) => [
                                    styles.subgroupHeader,
                                    mirroredRow(isRTL),
                                    groupExpanded ? styles.subgroupHeaderExpanded : null,
                                    pressed ? styles.subgroupHeaderPressed : null,
                                  ]}>
                                  <View style={[styles.subgroupTitleWrap, mirroredRow(isRTL)]}>
                                    <View style={styles.subgroupAccent} />
                                    <AppText variant="caption" color={theme.colors.primary700} align={isRTL ? 'right' : 'left'}>
                                      {group.title}
                                    </AppText>
                                  </View>
                                  <View style={[styles.subgroupMetaWrap, mirroredRow(isRTL)]}>
                                    <View style={styles.subgroupCountWrap}>
                                      <AppText variant="caption" color={theme.colors.primary700} align="center">
                                        {group.data.length}
                                      </AppText>
                                    </View>
                                    <Ionicons
                                      name={groupExpanded ? 'chevron-up' : 'chevron-down'}
                                      size={16}
                                      color={theme.colors.primary700}
                                    />
                                  </View>
                                </Pressable>
                              ) : null}
                              {groupExpanded ? (
                                <View style={styles.subgroupItemsWrap}>
                                  {group.data.map((item, index) => (
                                    <Fragment key={item.id}>
                                      <ProductCard
                                        item={item}
                                        onPress={() => onOpenProduct(item)}
                                        languageOverride={previewLanguage}
                                        isRTLOverride={previewIsRTL}
                                      />
                                      {index < group.data.length - 1 ? <View style={styles.itemSeparator} /> : null}
                                    </Fragment>
                                  ))}
                                </View>
                              ) : null}
                              {groupIndex < section.groups.length - 1 ? <View style={styles.groupSeparator} /> : null}
                            </View>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {visibleSections.length > 0 ? (
        <View style={[styles.floatingActionWrap, { bottom: floatingBottomOffset }]}>
          <AppButton
            title={t('home.completeOrder')}
            onPress={onOpenCart}
            disabled={cartCount === 0}
            testID="home-complete-order-button"
            accessibilityLabel={`${t('home.completeOrder')} (${cartCount})`}
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
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
    alignItems: 'center',
    minHeight: 68,
  },
  topTitleWrap: {
    flex: 1,
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    minWidth: 0,
  },
  logoWrap: {
    width: 68,
    height: 68,
    maxWidth: 68,
    maxHeight: 68,
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'center',
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
    minWidth: 0,
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
    flexShrink: 0,
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
    flexShrink: 1,
  },
  cartLabel: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  cartCountText: {
    fontSize: 11,
    lineHeight: 14,
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
  sectionsWrap: {
    gap: theme.spacing.md,
  },
  sectionBlock: {
    gap: theme.spacing.sm,
  },
  sectionRow: {
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary100,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  sectionRowExpanded: {
    borderColor: theme.colors.primary200,
    backgroundColor: theme.colors.secondaryCream,
  },
  sectionRowPressed: {
    opacity: 0.92,
  },
  sectionAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: theme.colors.secondaryCaramel,
  },
  sectionTitleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  sectionLeadingWrap: {
    flex: 1,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  sectionThumbnailFrame: {
    width: 60,
    height: 60,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.primary100,
    backgroundColor: theme.colors.primary50,
  },
  sectionThumbnail: {
    width: '100%',
    height: '100%',
  },
  sectionThumbnailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary50,
  },
  sectionTitleContent: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  sectionMetaWrap: {
    alignItems: 'center',
    gap: theme.spacing.sm,
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
  sectionCountWrapExpanded: {
    backgroundColor: theme.colors.surface,
  },
  chevronWrap: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary50,
    borderWidth: 1,
    borderColor: theme.colors.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronWrapExpanded: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.primary200,
  },
  expandedItemsWrap: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.primary100,
  },
  subgroupBlock: {
    gap: theme.spacing.sm,
  },
  subgroupHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary100,
    backgroundColor: theme.colors.surface,
  },
  subgroupHeaderExpanded: {
    borderColor: theme.colors.primary200,
    backgroundColor: theme.colors.primary50,
  },
  subgroupHeaderPressed: {
    opacity: 0.9,
  },
  subgroupTitleWrap: {
    flex: 1,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  subgroupAccent: {
    width: 8,
    height: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.secondaryCaramel,
  },
  subgroupMetaWrap: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  subgroupCountWrap: {
    minWidth: 26,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: theme.colors.primary100,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subgroupItemsWrap: {
    gap: 0,
  },
  groupSeparator: {
    height: 1,
    backgroundColor: theme.colors.primary100,
    marginHorizontal: theme.spacing.md,
  },
  itemSeparator: {
    height: theme.spacing.sm,
  },
  stateWrap: {
    paddingVertical: theme.spacing.lg,
  },
  floatingActionWrap: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    backgroundColor: 'transparent',
  },
});
