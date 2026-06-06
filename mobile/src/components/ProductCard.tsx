import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { Item, LanguageCode } from '@/types/api';
import { formatCurrency, toNumber } from '@/utils/format';
import { getLocalizedValue } from '@/utils/i18n';
import { mirroredRow } from '@/utils/layout';

import { AppCard } from './AppCard';
import { AppText } from './AppText';

type ProductCardProps = {
  item: Item;
  onPress: () => void;
  languageOverride?: LanguageCode;
  isRTLOverride?: boolean;
};

const getLowestPrice = (item: Item): number => {
  const prices = item.item_types.flatMap((itemType) => itemType.sizes.map((size) => toNumber(size.price)));
  return prices.length ? Math.min(...prices) : 0;
};

export const ProductCard = ({ item, onPress, languageOverride, isRTLOverride }: ProductCardProps) => {
  const { language } = useAppTranslation();
  const { isRTL } = useLanguage();
  const displayLanguage = languageOverride ?? language;
  const displayIsRTL = isRTLOverride ?? isRTL;
  const title = getLocalizedValue(item, displayLanguage, 'name');
  const description = getLocalizedValue(item, displayLanguage, 'description');
  const lowestPrice = getLowestPrice(item);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${formatCurrency(lowestPrice, displayLanguage)}`}
      hitSlop={6}
      style={({ pressed }) => [styles.pressable, pressed ? styles.pressed : null]}>
      <AppCard style={styles.card}>
        <View style={[styles.row, mirroredRow(displayIsRTL)]}>
          <View style={styles.imageFrame}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={24} color={theme.colors.textMuted} />
              </View>
            )}
          </View>
          <View style={styles.content}>
            <AppText variant="h3" numberOfLines={2}>
              {title}
            </AppText>
            {description ? (
              <AppText variant="bodySmall" color={theme.colors.textSecondary} numberOfLines={2}>
                {description}
              </AppText>
            ) : null}
            <View style={[styles.actionRow, mirroredRow(displayIsRTL)]}>
              <AppText variant="price" color={theme.colors.primary600}>
                {formatCurrency(lowestPrice, displayLanguage)}
              </AppText>
              <View style={styles.actionIconWrap}>
                <Ionicons
                  name={displayIsRTL ? 'arrow-back' : 'arrow-forward'}
                  size={theme.iconSizes.sm}
                  color={theme.colors.primary700}
                />
              </View>
            </View>
          </View>
        </View>
      </AppCard>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    borderRadius: theme.radius.lg,
  },
  pressed: {
    opacity: 0.94,
  },
  card: {
    borderColor: theme.colors.primary100,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    alignItems: 'stretch',
  },
  imageFrame: {
    width: 112,
    height: 112,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary100,
    backgroundColor: theme.colors.secondarySand,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.sectionBackground,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.secondarySand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  actionRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.xs,
  },
  actionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.primary100,
    backgroundColor: theme.colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
