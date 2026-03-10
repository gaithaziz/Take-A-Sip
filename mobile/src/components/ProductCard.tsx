import { Image, Pressable, StyleSheet, View } from 'react-native';

import { useAppTranslation } from '@/hooks/useAppTranslation';
import { theme } from '@/theme';
import { Item } from '@/types/api';
import { formatCurrency, toNumber } from '@/utils/format';
import { getLocalizedValue } from '@/utils/i18n';

import { AppCard } from './AppCard';
import { AppText } from './AppText';

type ProductCardProps = {
  item: Item;
  onPress: () => void;
};

const getLowestPrice = (item: Item): number => {
  const prices = item.item_types.flatMap((itemType) => itemType.sizes.map((size) => toNumber(size.price)));
  return prices.length ? Math.min(...prices) : 0;
};

export const ProductCard = ({ item, onPress }: ProductCardProps) => {
  const { language } = useAppTranslation();
  const title = getLocalizedValue(item, language, 'name');
  const description = getLocalizedValue(item, language, 'description');
  const lowestPrice = getLowestPrice(item);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${formatCurrency(lowestPrice, language)}`}
      hitSlop={6}>
      <AppCard>
        <View style={styles.row}>
          {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.image} resizeMode="cover" /> : null}
          <View style={styles.content}>
            <AppText variant="h3">{title}</AppText>
            {description ? (
              <AppText variant="bodySmall" color={theme.colors.textSecondary} numberOfLines={2}>
                {description}
              </AppText>
            ) : null}
            <AppText variant="price" color={theme.colors.primary600}>
              {formatCurrency(lowestPrice, language)}
            </AppText>
          </View>
        </View>
      </AppCard>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  image: {
    width: 88,
    height: 88,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.sectionBackground,
  },
  content: {
    flex: 1,
    gap: theme.spacing.sm,
  },
});
