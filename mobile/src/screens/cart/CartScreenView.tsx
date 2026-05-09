import { ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppText } from '@/components/AppText';
import { EmptyState } from '@/components/EmptyState';
import { QuantitySelector } from '@/components/QuantitySelector';
import { TopAppBar } from '@/components/TopAppBar';
import { CartItem } from '@/state/CartContext';
import { theme } from '@/theme';
import { LanguageCode } from '@/types/api';
import { formatCurrency, toNumber } from '@/utils/format';
import { getLocalizedValue } from '@/utils/i18n';
import { mirroredRow } from '@/utils/layout';

type CartScreenViewProps = {
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  language: LanguageCode;
  isRTL: boolean;
  title: string;
  removeItemLabel: string;
  checkoutLabel: string;
  emptyTitle: string;
  emptySubtitle: string;
  subtotalLabel: string;
  discountLabel: string;
  totalLabel: string;
  offerAppliedLabel: string;
  firstTimeOfferAppliedLabel: string;
  appliedPromotionType: string | null;
  bottomInset: number;
  onBack: () => void;
  onRemoveItem: (id: string) => void;
  onUpdateQuantity: (id: string, value: number) => void;
  onCheckout: () => void;
};

const computeLineTotal = (item: CartItem) =>
  (toNumber(item.size.price) + item.addons.reduce((sum, addon) => sum + toNumber(addon.price), 0)) * item.quantity;

const getLineMax = (items: CartItem[], item: CartItem) => {
  if (item.size.order_limit == null) {
    return null;
  }
  const otherQuantityForSize = items
    .filter((entry) => entry.id !== item.id && entry.size.id === item.size.id)
    .reduce((sum, entry) => sum + entry.quantity, 0);
  return Math.max(0, item.size.order_limit - otherQuantityForSize);
};

export const CartScreenView = ({
  items,
  subtotal,
  discount,
  total,
  language,
  isRTL,
  title,
  removeItemLabel,
  checkoutLabel,
  emptyTitle,
  emptySubtitle,
  subtotalLabel,
  discountLabel,
  totalLabel,
  offerAppliedLabel,
  firstTimeOfferAppliedLabel,
  appliedPromotionType,
  bottomInset,
  onBack,
  onRemoveItem,
  onUpdateQuantity,
  onCheckout,
}: CartScreenViewProps) => {
  const hasItems = items.length > 0;

  return (
    <View style={styles.page}>
      <TopAppBar title={title} onBack={onBack} />
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: hasItems ? 230 + bottomInset : bottomInset + theme.spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {!hasItems ? (
          <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
        ) : (
          items.map((item) => (
            <AppCard key={item.id} style={styles.itemCard}>
              <View style={[styles.itemHeader, mirroredRow(isRTL)]}>
                <View style={styles.itemInfo}>
                  <AppText variant="h3" numberOfLines={2}>
                    {getLocalizedValue(item.item, language, 'name')}
                  </AppText>
                  <AppText variant="bodySmall" color={theme.colors.textSecondary} numberOfLines={1}>
                    {getLocalizedValue(item.size, language, 'name')}
                  </AppText>
                </View>
                <AppText variant="price" color={theme.colors.primary700} align={isRTL ? 'left' : 'right'}>
                  {formatCurrency(computeLineTotal(item), language)}
                </AppText>
              </View>

              {item.addons.length > 0 ? (
                <View style={styles.addonsWrap}>
                  {item.addons.map((addon) => (
                    <View key={addon.id} style={styles.addonChip}>
                      <AppText variant="caption" color={theme.colors.textSecondary}>
                        + {getLocalizedValue(addon, language, 'name')}
                      </AppText>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={[styles.itemActions, mirroredRow(isRTL)]}>
                <AppButton title={removeItemLabel} variant="ghost" fullWidth={false} onPress={() => onRemoveItem(item.id)} />
                <QuantitySelector value={item.quantity} max={getLineMax(items, item)} onChange={(value) => onUpdateQuantity(item.id, value)} />
              </View>
            </AppCard>
          ))
        )}
      </ScrollView>

      {hasItems ? (
        <View style={[styles.stickyWrap, { paddingBottom: Math.max(bottomInset, theme.spacing.md) }]}>
          <AppCard style={styles.summaryCard}>
            <View style={[styles.summaryRow, mirroredRow(isRTL)]}>
              <AppText>{subtotalLabel}</AppText>
              <AppText>{formatCurrency(subtotal, language)}</AppText>
            </View>
            {discount > 0 ? (
              <View style={[styles.summaryRow, mirroredRow(isRTL)]}>
                <AppText>{discountLabel}</AppText>
                <AppText color={theme.colors.success}>-{formatCurrency(discount, language)}</AppText>
              </View>
            ) : null}
            {appliedPromotionType ? (
              <AppText variant="caption" color={theme.colors.textSecondary}>
                {appliedPromotionType === 'FIRST_TIME' ? firstTimeOfferAppliedLabel : offerAppliedLabel}
              </AppText>
            ) : null}
            <View style={[styles.totalRow, mirroredRow(isRTL)]}>
              <AppText variant="h3">{totalLabel}</AppText>
              <AppText variant="price" color={theme.colors.primary700}>
                {formatCurrency(total, language)}
              </AppText>
            </View>
            <AppButton title={checkoutLabel} onPress={onCheckout} />
          </AppCard>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  itemCard: {
    gap: theme.spacing.md,
  },
  itemHeader: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  itemInfo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  addonsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  addonChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
  },
  itemActions: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  stickyWrap: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    ...theme.shadows.floating,
  },
  summaryCard: {
    gap: theme.spacing.sm,
    borderColor: theme.colors.primary100,
    backgroundColor: theme.colors.surface,
  },
  summaryRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
