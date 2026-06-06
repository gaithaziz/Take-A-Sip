import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTranslation } from '@/hooks/useAppTranslation';
import { theme } from '@/theme';
import { Item, LanguageCode } from '@/types/api';
import { formatCurrency, toNumber } from '@/utils/format';
import { getLocalizedValue } from '@/utils/i18n';

import { AppButton } from '../AppButton';
import { AppCard } from '../AppCard';
import { AppText } from '../AppText';

type AdminCustomerProductPreviewProps = {
  item: Item;
  language: LanguageCode;
  variant?: 'card' | 'detail';
};

const getLowestPrice = (item: Item) => {
  const activePrices = item.item_types
    .filter((itemType) => itemType.is_active)
    .flatMap((itemType) => itemType.sizes.filter((size) => size.is_active).map((size) => toNumber(size.price)));
  return activePrices.length ? Math.min(...activePrices) : 0;
};

const previewRow = (isRTL: boolean) => ({
  flexDirection: isRTL ? 'row-reverse' : 'row',
} as const);

const previewTextDirection = (isRTL: boolean) => ({
  writingDirection: isRTL ? 'rtl' : 'ltr',
} as const);

export const AdminCustomerProductPreview = ({
  item,
  language,
  variant = 'card',
}: AdminCustomerProductPreviewProps) => {
  const { t } = useAppTranslation();
  const isRTL = language === 'ar';
  const title = getLocalizedValue(item, language, 'name') || t('admin.item');
  const description = getLocalizedValue(item, language, 'description');
  const activeTypes = useMemo(() => item.item_types.filter((itemType) => itemType.is_active), [item.item_types]);
  const [selectedTypeId, setSelectedTypeId] = useState(activeTypes[0]?.id ?? '');
  const selectedType = activeTypes.find((itemType) => itemType.id === selectedTypeId) ?? activeTypes[0];
  const activeSizes = selectedType?.sizes.filter((size) => size.is_active) ?? [];
  const selectedSize = activeSizes[0];
  const activeAddons = selectedSize?.addons.filter((addon) => addon.is_active) ?? [];
  const lowestPrice = getLowestPrice(item);

  if (variant === 'card') {
    return (
      <AppCard style={styles.cardPreview}>
        <View style={[styles.cardRow, previewRow(isRTL)]}>
          <View style={styles.cardImageFrame}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={24} color={theme.colors.textMuted} />
              </View>
            )}
          </View>
          <View style={styles.cardContent}>
            <AppText variant="h3" numberOfLines={2} align={isRTL ? 'right' : 'left'} style={previewTextDirection(isRTL)}>
              {title}
            </AppText>
            {description ? (
              <AppText
                variant="bodySmall"
                color={theme.colors.textSecondary}
                numberOfLines={2}
                align={isRTL ? 'right' : 'left'}
                style={previewTextDirection(isRTL)}>
                {description}
              </AppText>
            ) : null}
            <View style={[styles.priceRow, previewRow(isRTL)]}>
              <AppText variant="price" color={theme.colors.primary600} style={previewTextDirection(isRTL)}>
                {formatCurrency(lowestPrice, language)}
              </AppText>
              <View style={styles.cardArrow}>
                <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={theme.iconSizes.sm} color={theme.colors.primary700} />
              </View>
            </View>
          </View>
        </View>
      </AppCard>
    );
  }

  return (
    <View style={styles.detailPreview}>
      <View style={styles.heroImageFrame}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={theme.iconSizes.xl} color={theme.colors.textMuted} />
          </View>
        )}
      </View>
      <View style={styles.detailHeader}>
        <AppText variant="h1" align={isRTL ? 'right' : 'left'} style={previewTextDirection(isRTL)}>
          {title}
        </AppText>
        {description ? (
          <AppText variant="bodySmall" color={theme.colors.textSecondary} align={isRTL ? 'right' : 'left'} style={previewTextDirection(isRTL)}>
            {description}
          </AppText>
        ) : null}
      </View>

      {activeTypes.length > 0 ? (
        <View style={styles.previewSection}>
          <AppText variant="h3" align={isRTL ? 'right' : 'left'} style={previewTextDirection(isRTL)}>
            {t('product.selectType')}
          </AppText>
          <View style={styles.choiceStack}>
            {activeTypes.map((itemType) => (
              <Pressable
                key={itemType.id}
                onPress={() => setSelectedTypeId(itemType.id)}
                style={[styles.choice, itemType.id === selectedType?.id ? styles.choiceActive : null]}
                accessibilityRole="radio"
                accessibilityState={{ selected: itemType.id === selectedType?.id }}>
                <AppText align={isRTL ? 'right' : 'left'} style={previewTextDirection(isRTL)}>
                  {getLocalizedValue(itemType, language, 'name')}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {activeSizes.length > 0 ? (
        <View style={styles.previewSection}>
          <AppText variant="h3" align={isRTL ? 'right' : 'left'} style={previewTextDirection(isRTL)}>
            {t('product.selectSize')}
          </AppText>
          <View style={styles.choiceStack}>
            {activeSizes.map((size) => (
              <View key={size.id} style={[styles.choice, size.id === selectedSize?.id ? styles.choiceActive : null]}>
                <View style={[styles.choiceMeta, previewRow(isRTL)]}>
                  <AppText style={[styles.choiceLabel, previewTextDirection(isRTL)]} align={isRTL ? 'right' : 'left'}>
                    {getLocalizedValue(size, language, 'name')}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.textSecondary} style={previewTextDirection(isRTL)}>
                    {formatCurrency(toNumber(size.price), language)}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {activeAddons.length > 0 ? (
        <View style={styles.previewSection}>
          <AppText variant="h3" align={isRTL ? 'right' : 'left'} style={previewTextDirection(isRTL)}>
            {t('product.selectAddons')}
          </AppText>
          <View style={styles.choiceStack}>
            {activeAddons.map((addon) => (
              <View key={addon.id} style={styles.choice}>
                <View style={[styles.choiceMeta, previewRow(isRTL)]}>
                  <AppText style={[styles.choiceLabel, previewTextDirection(isRTL)]} align={isRTL ? 'right' : 'left'}>
                    {getLocalizedValue(addon, language, 'name')}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.textSecondary} style={previewTextDirection(isRTL)}>
                    +{formatCurrency(toNumber(addon.price), language)}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {activeTypes.length === 0 || activeSizes.length === 0 ? (
        <AppCard style={styles.warningCard}>
          <AppText variant="bodySmall" color={theme.colors.warning} align={isRTL ? 'right' : 'left'} style={previewTextDirection(isRTL)}>
            {t('admin.productNeedsVariant')}
          </AppText>
        </AppCard>
      ) : null}

      <AppCard style={styles.disabledFooter}>
        <View style={[styles.footerRow, previewRow(isRTL)]}>
          <AppText variant="price" color={theme.colors.primary700} style={previewTextDirection(isRTL)}>
            {formatCurrency(toNumber(selectedSize?.price ?? lowestPrice), language)}
          </AppText>
          <AppText variant="caption" color={theme.colors.textSecondary} style={previewTextDirection(isRTL)}>
            {t('admin.disabledPreviewAction')}
          </AppText>
        </View>
        <AppButton title={t('product.addToCart')} onPress={() => undefined} disabled />
      </AppCard>
    </View>
  );
};

const styles = StyleSheet.create({
  cardPreview: {
    borderColor: theme.colors.primary100,
    backgroundColor: theme.colors.surface,
  },
  cardRow: {
    gap: theme.spacing.md,
    alignItems: 'stretch',
  },
  cardImageFrame: {
    width: 96,
    height: 96,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary100,
    overflow: 'hidden',
    backgroundColor: theme.colors.secondarySand,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.secondarySand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  cardArrow: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.primary100,
    backgroundColor: theme.colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailPreview: {
    gap: theme.spacing.lg,
  },
  heroImageFrame: {
    height: 220,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.sectionBackground,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  detailHeader: {
    gap: theme.spacing.sm,
  },
  previewSection: {
    gap: theme.spacing.md,
  },
  choiceStack: {
    gap: theme.spacing.sm,
  },
  choice: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  choiceActive: {
    borderColor: theme.colors.primary500,
    backgroundColor: theme.colors.primary50,
  },
  choiceMeta: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  choiceLabel: {
    flex: 1,
  },
  warningCard: {
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.warningSurface,
  },
  disabledFooter: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  footerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
});
