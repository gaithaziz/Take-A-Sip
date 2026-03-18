import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { Addon } from '@/types/api';
import { formatCurrency, toNumber } from '@/utils/format';
import { getLocalizedValue } from '@/utils/i18n';
import { mirroredRow } from '@/utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetails'>;

export const ProductDetailsScreen = ({ route, navigation }: Props) => {
  const { item } = route.params;
  const { t, language } = useAppTranslation();
  const { isRTL } = useLanguage();
  const { addItem } = useCart();
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
  };

  const addToCart = () => {
    if (!selectedType || !selectedSize) {
      return;
    }
    addItem({
      item,
      itemType: selectedType,
      size: selectedSize,
      addons: selectedAddons,
      quantity,
    });
    navigation.navigate('Cart');
  };

  return (
    <View style={styles.page}>
      <TopAppBar title={getLocalizedValue(item, language, 'name')} onBack={() => navigation.goBack()} />
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {item.image_url ? (
            <View style={styles.imageWrap}>
              <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
            </View>
          ) : (
            <View style={[styles.imageWrap, styles.imagePlaceholder]}>
              <Ionicons name="image-outline" size={theme.iconSizes.xl} color={theme.colors.textMuted} />
            </View>
          )}
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
                    <AppText align={isRTL ? 'right' : 'left'}>{getLocalizedValue(itemType, language, 'name')}</AppText>
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
            <QuantitySelector value={quantity} onChange={setQuantity} />
            <AppText variant="price" color={theme.colors.primary700}>
              {formatCurrency(totalPrice, language)}
            </AppText>
          </View>
          <AppButton title={t('product.addToCart')} onPress={addToCart} style={styles.addButton} />
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
  imageWrap: {
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
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
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
