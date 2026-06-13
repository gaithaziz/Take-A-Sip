import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppText } from '@/components/AppText';
import { QuantitySelector } from '@/components/QuantitySelector';
import { TopAppBar } from '@/components/TopAppBar';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { RootStackParamList } from '@/navigation/types';
import { useCart } from '@/state/CartContext';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { Addon, Item, ItemType, Size } from '@/types/api';
import { formatCurrency, toNumber } from '@/utils/format';
import { getLocalizedValue } from '@/utils/i18n';
import { mirroredRow } from '@/utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetails'>;

type ProductPhoto = {
  id: string;
  imageUrl: string;
  label: string;
};

const addUniquePhoto = (photos: ProductPhoto[], seenUrls: Set<string>, photo: ProductPhoto) => {
  if (seenUrls.has(photo.imageUrl)) {
    return;
  }
  seenUrls.add(photo.imageUrl);
  photos.push(photo);
};

const collectProductPhotos = (item: Item, language: 'en' | 'ar'): ProductPhoto[] => {
  const photos: ProductPhoto[] = [];
  const seenUrls = new Set<string>();

  if (item.image_url) {
    addUniquePhoto(photos, seenUrls, {
      id: `item-${item.id}`,
      imageUrl: item.image_url,
      label: getLocalizedValue(item, language, 'name'),
    });
  }

  item.item_types
    .filter((itemType) => itemType.is_active)
    .forEach((itemType) => {
      if (itemType.image_url) {
        addUniquePhoto(photos, seenUrls, {
          id: `type-${itemType.id}`,
          imageUrl: itemType.image_url,
          label: getLocalizedValue(itemType, language, 'name'),
        });
      }

      itemType.sizes
        .filter((size) => size.is_active)
        .forEach((size) => {
          if (size.image_url) {
            addUniquePhoto(photos, seenUrls, {
              id: `size-${size.id}`,
              imageUrl: size.image_url,
              label: getLocalizedValue(size, language, 'name'),
            });
          }

          size.addons
            .filter((addon) => addon.is_active)
            .forEach((addon) => {
              if (addon.image_url) {
                addUniquePhoto(photos, seenUrls, {
                  id: `addon-${addon.id}`,
                  imageUrl: addon.image_url,
                  label: getLocalizedValue(addon, language, 'name'),
                });
              }
            });
        });
    });

  return photos;
};

export const ProductDetailsScreen = ({ route, navigation }: Props) => {
  const { item } = route.params;
  const { t, language } = useAppTranslation();
  const { isRTL } = useLanguage();
  const { addItem, items: cartItems = [] } = useCart();
  const insets = useSafeAreaInsets();

  const activeTypes = useMemo(() => item.item_types.filter((itemType) => itemType.is_active), [item.item_types]);
  const [selectedTypeId, setSelectedTypeId] = useState(activeTypes[0]?.id ?? '');
  const selectedType = useMemo(
    () => activeTypes.find((itemType) => itemType.id === selectedTypeId) ?? activeTypes[0],
    [activeTypes, selectedTypeId],
  );
  const activeSizes = useMemo(() => selectedType?.sizes.filter((size) => size.is_active) ?? [], [selectedType]);
  const [selectedSizeId, setSelectedSizeId] = useState(activeSizes[0]?.id ?? '');
  const selectedSize = useMemo(
    () => activeSizes.find((size) => size.id === selectedSizeId) ?? activeSizes[0],
    [activeSizes, selectedSizeId],
  );
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const productPhotos = useMemo(() => collectProductPhotos(item, language), [item, language]);
  const selectedSizeOrderLimit = selectedSize?.order_limit ?? null;
  const quantityAlreadyInCart = useMemo(
    () => (selectedSize ? cartItems.filter((cartItem) => cartItem.size.id === selectedSize.id).reduce((sum, cartItem) => sum + cartItem.quantity, 0) : 0),
    [cartItems, selectedSize],
  );
  const quantityMax = selectedSizeOrderLimit == null ? null : Math.max(0, selectedSizeOrderLimit - quantityAlreadyInCart);

  useEffect(() => {
    if (activeTypes.length === 0) {
      return;
    }
    if (!activeTypes.some((itemType) => itemType.id === selectedTypeId)) {
      setSelectedTypeId(activeTypes[0].id);
    }
  }, [activeTypes, selectedTypeId]);

  useEffect(() => {
    if (activeSizes.length === 0) {
      return;
    }
    if (!activeSizes.some((size) => size.id === selectedSizeId)) {
      setSelectedSizeId(activeSizes[0].id);
      setSelectedAddonIds([]);
    }
  }, [activeSizes, selectedSizeId]);

  const activeAddons = (selectedSize?.addons ?? []).filter((addon) => addon.is_active);
  const selectedAddons = activeAddons.filter((addon) => selectedAddonIds.includes(addon.id));

  const totalPrice = useMemo(() => {
    if (!selectedSize) {
      return 0;
    }
    const addonsTotal = selectedAddons.reduce((sum, addon) => sum + toNumber(addon.price), 0);
    return (toNumber(selectedSize.price) + addonsTotal) * quantity;
  }, [quantity, selectedAddons, selectedSize]);

  const toggleAddon = (addon: Addon) => {
    setSelectedAddonIds((prev) =>
      prev.includes(addon.id) ? prev.filter((addonId) => addonId !== addon.id) : [...prev, addon.id],
    );
  };

  const handleTypeSelect = (typeId: string) => {
    setSelectedTypeId(typeId);
    const nextType = activeTypes.find((itemType) => itemType.id === typeId);
    const nextTypeSizes = nextType?.sizes.filter((size) => size.is_active) ?? [];
    setSelectedSizeId(nextTypeSizes[0]?.id ?? '');
    setSelectedAddonIds([]);
  };

  const handleSizeSelect = (sizeId: string) => {
    setSelectedSizeId(sizeId);
    setSelectedAddonIds([]);
    setQuantity(1);
  };

  const renderChoiceImage = (entity: ItemType | Size | Addon) =>
    entity.image_url ? (
      <Image
        source={{ uri: entity.image_url }}
        style={styles.choiceImage}
        resizeMode="cover"
        accessibilityLabel={getLocalizedValue(entity, language, 'name')}
        testID={`choice-image-${entity.id}`}
      />
    ) : null;

  const addToCart = () => {
    if (!selectedType || !selectedSize) {
      return;
    }
    const added = addItem({
      item,
      itemType: selectedType,
      size: selectedSize,
      addons: selectedAddons,
      quantity,
    });
    if (!added && selectedSize.order_limit != null) {
      Alert.alert(t('common.appName'), t('product.orderLimitReached', { limit: selectedSize.order_limit }));
      return;
    }
    Alert.alert(t('common.appName'), t('product.addedToCart'));
    navigation.goBack();
  };

  return (
    <View style={styles.page}>
      <TopAppBar title={getLocalizedValue(item, language, 'name')} onBack={() => navigation.goBack()} />
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {productPhotos.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoGalleryContent}
              style={styles.photoGallery}
              testID="product-photo-gallery">
              {productPhotos.map((photo) => (
                <View key={photo.id} style={styles.imageWrap}>
                  <Image
                    source={{ uri: photo.imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                    accessibilityLabel={photo.label}
                    testID="product-gallery-image"
                  />
                </View>
              ))}
            </ScrollView>
          ) : null}
          <View style={styles.header}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {getLocalizedValue(item, language, 'description')}
            </AppText>
          </View>

          <View style={styles.section}>
            <AppText variant="h3">{t('product.selectType')}</AppText>
            <View style={styles.choices}>
              {activeTypes.map((itemType) => (
                  <Pressable
                    key={itemType.id}
                    onPress={() => handleTypeSelect(itemType.id)}
                    style={[styles.choice, itemType.id === selectedType?.id ? styles.choiceActive : null]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: itemType.id === selectedType?.id }}
                    accessibilityLabel={getLocalizedValue(itemType, language, 'name')}
                    hitSlop={6}>
                    <View style={[styles.choiceMeta, mirroredRow(isRTL)]}>
                      {renderChoiceImage(itemType)}
                      <AppText style={styles.choiceLabel} align={isRTL ? 'right' : 'left'}>
                        {getLocalizedValue(itemType, language, 'name')}
                      </AppText>
                    </View>
                  </Pressable>
                ))}
            </View>
          </View>

          <View style={styles.section}>
            <AppText variant="h3">{t('product.selectSize')}</AppText>
            <View style={styles.choices}>
              {activeSizes.map((size) => (
                  <Pressable
                    key={size.id}
                    onPress={() => handleSizeSelect(size.id)}
                    style={[styles.choice, size.id === selectedSize?.id ? styles.choiceActive : null]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: size.id === selectedSize?.id }}
                    accessibilityLabel={`${getLocalizedValue(size, language, 'name')} ${formatCurrency(toNumber(size.price), language)}`}
                    hitSlop={6}>
                    <View style={[styles.choiceMeta, mirroredRow(isRTL)]}>
                      {renderChoiceImage(size)}
                      <AppText style={styles.choiceLabel} align={isRTL ? 'right' : 'left'}>
                        {getLocalizedValue(size, language, 'name')}
                      </AppText>
                      <AppText variant="caption" color={theme.colors.textSecondary}>
                        {formatCurrency(toNumber(size.price), language)}
                      </AppText>
                    </View>
                  </Pressable>
                ))}
            </View>
          </View>

          <View style={styles.section}>
            <AppText variant="h3">{t('product.selectAddons')}</AppText>
            <View style={styles.choices}>
              {activeAddons.map((addon) => {
                const selected = selectedAddonIds.includes(addon.id);
                return (
                  <Pressable
                    key={addon.id}
                    onPress={() => toggleAddon(addon)}
                    style={[styles.choice, selected ? styles.choiceActive : null]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${getLocalizedValue(addon, language, 'name')} +${formatCurrency(toNumber(addon.price), language)}`}
                    hitSlop={6}>
                    <View style={[styles.choiceMeta, mirroredRow(isRTL)]}>
                      {renderChoiceImage(addon)}
                      <AppText style={styles.choiceLabel} align={isRTL ? 'right' : 'left'}>
                        {getLocalizedValue(addon, language, 'name')}
                      </AppText>
                      <AppText variant="caption" color={theme.colors.textSecondary}>
                        +{formatCurrency(toNumber(addon.price), language)}
                      </AppText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <AppCard style={[styles.stickyCard, { paddingBottom: Math.max(insets.bottom, theme.spacing.md) }]}>
          <View style={[styles.footer, mirroredRow(isRTL)]}>
            <QuantitySelector value={quantity} onChange={setQuantity} max={quantityMax} />
            <AppText variant="price" color={theme.colors.primary700}>
              {formatCurrency(totalPrice, language)}
            </AppText>
          </View>
          {selectedSizeOrderLimit != null ? (
            <AppText variant="caption" color={theme.colors.textSecondary}>
              {t('product.orderLimitReached', { limit: selectedSizeOrderLimit })}
            </AppText>
          ) : null}
          <AppButton title={t('product.addToCart')} onPress={addToCart} style={styles.addButton} disabled={quantityMax === 0} />
        </AppCard>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  scrollContent: {
    gap: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
  },
  photoGallery: {
    marginHorizontal: -theme.spacing.lg,
  },
  photoGalleryContent: {
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  imageWrap: {
    width: 260,
    height: 220,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.sectionBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  header: {
    gap: theme.spacing.sm,
  },
  section: {
    gap: theme.spacing.md,
  },
  choices: {
    gap: theme.spacing.sm,
  },
  choice: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  choiceMeta: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  choiceLabel: {
    flex: 1,
  },
  choiceImage: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.sectionBackground,
  },
  choiceActive: {
    borderColor: theme.colors.primary500,
    backgroundColor: theme.colors.primary50,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  addButton: {
    marginTop: theme.spacing.sm,
  },
  stickyCard: {
    marginTop: theme.spacing.md,
  },
});
