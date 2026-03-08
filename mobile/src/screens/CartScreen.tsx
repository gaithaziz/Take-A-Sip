import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { QuantitySelector } from '@/components/QuantitySelector';
import { useCartPricing } from '@/hooks/useCartPricing';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { RootStackParamList } from '@/navigation/types';
import { useCart } from '@/state/CartContext';
import { theme } from '@/theme';
import { formatCurrency, toNumber } from '@/utils/format';
import { getLocalizedValue } from '@/utils/i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'Cart'>;

export const CartScreen = ({ navigation }: Props) => {
  const { t, language } = useAppTranslation();
  const { items, removeItem, updateQuantity, subtotal } = useCart();
  const { discount, total, appliedPromotion } = useCartPricing(subtotal);

  if (items.length === 0) {
    return (
      <AppShell>
        <AppText variant="h1">{t('cart.title')}</AppText>
        <EmptyState title={t('cart.emptyTitle')} subtitle={t('cart.emptySubtitle')} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AppText variant="h1">{t('cart.title')}</AppText>
      {items.map((item) => (
        <AppCard key={item.id}>
          <View style={styles.row}>
            <View style={styles.info}>
              <AppText variant="h3">{getLocalizedValue(item.item, language, 'name')}</AppText>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                {getLocalizedValue(item.size, language, 'name')}
              </AppText>
              {item.addons.map((addon) => (
                <AppText key={addon.id} variant="caption" color={theme.colors.textSecondary}>
                  + {getLocalizedValue(addon, language, 'name')}
                </AppText>
              ))}
              <AppButton
                title={t('cart.removeItem')}
                variant="ghost"
                fullWidth={false}
                onPress={() => removeItem(item.id)}
              />
            </View>
            <View style={styles.controls}>
              <QuantitySelector value={item.quantity} onChange={(value) => updateQuantity(item.id, value)} />
              <AppText variant="price" color={theme.colors.primary700}>
                {formatCurrency(
                  (toNumber(item.size.price) +
                    item.addons.reduce((sum, addon) => sum + toNumber(addon.price), 0)) *
                    item.quantity,
                  language,
                )}
              </AppText>
            </View>
          </View>
        </AppCard>
      ))}

      <AppCard>
        <View style={styles.summaryRow}>
          <AppText>{t('common.subtotal')}</AppText>
          <AppText>{formatCurrency(subtotal, language)}</AppText>
        </View>
        {discount > 0 ? (
          <View style={styles.summaryRow}>
            <AppText>{t('common.discount')}</AppText>
            <AppText color={theme.colors.success}>-{formatCurrency(discount, language)}</AppText>
          </View>
        ) : null}
        {appliedPromotion ? (
          <AppText variant="caption" color={theme.colors.textSecondary}>
            {appliedPromotion.type === 'FIRST_TIME' ? t('cart.firstTimeOfferApplied') : t('cart.offerApplied')}
          </AppText>
        ) : null}
        <View style={styles.summaryRow}>
          <AppText variant="h3">{t('common.total')}</AppText>
          <AppText variant="price" color={theme.colors.primary700}>
            {formatCurrency(total, language)}
          </AppText>
        </View>
        <AppButton title={t('cart.checkout')} onPress={() => navigation.navigate('Checkout')} />
      </AppCard>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  info: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  controls: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
});
