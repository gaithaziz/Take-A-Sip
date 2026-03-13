import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { TopAppBar } from '@/components/TopAppBar';
import { theme } from '@/theme';
import { LanguageCode } from '@/types/api';
import { formatCurrency } from '@/utils/format';
import { mirroredRow } from '@/utils/layout';

type CheckoutOrderType = 'pickup' | 'delivery';

type CheckoutScreenViewProps = {
  title: string;
  pickupLabel: string;
  deliveryLabel: string;
  deliveryAddressLabel: string;
  notesLabel: string;
  subtotalLabel: string;
  discountLabel: string;
  totalLabel: string;
  placeOrderLabel: string;
  language: LanguageCode;
  isRTL: boolean;
  orderType: CheckoutOrderType;
  deliveryAddress: string;
  deliveryAddressError?: string;
  notes: string;
  subtotal: number;
  discount: number;
  total: number;
  loading: boolean;
  canPlaceOrder: boolean;
  bottomInset: number;
  onBack: () => void;
  onSelectOrderType: (next: CheckoutOrderType) => void;
  onChangeDeliveryAddress: (value: string) => void;
  onChangeNotes: (value: string) => void;
  onPlaceOrder: () => void;
};

export const CheckoutScreenView = ({
  title,
  pickupLabel,
  deliveryLabel,
  deliveryAddressLabel,
  notesLabel,
  subtotalLabel,
  discountLabel,
  totalLabel,
  placeOrderLabel,
  language,
  isRTL,
  orderType,
  deliveryAddress,
  deliveryAddressError,
  notes,
  subtotal,
  discount,
  total,
  loading,
  canPlaceOrder,
  bottomInset,
  onBack,
  onSelectOrderType,
  onChangeDeliveryAddress,
  onChangeNotes,
  onPlaceOrder,
}: CheckoutScreenViewProps) => {
  return (
    <View style={styles.page}>
      <TopAppBar title={title} onBack={onBack} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: 232 + bottomInset,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <AppCard style={styles.selectorCard}>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            {title}
          </AppText>
          <View style={[styles.selectorRow, mirroredRow(isRTL)]}>
            <Pressable
              style={[styles.option, orderType === 'pickup' ? styles.optionActive : null]}
              onPress={() => onSelectOrderType('pickup')}
              accessibilityRole="radio"
              accessibilityState={{ selected: orderType === 'pickup' }}
              accessibilityLabel={pickupLabel}
              hitSlop={6}>
              <View style={styles.optionIndicatorWrap}>
                <View style={[styles.optionIndicator, orderType === 'pickup' ? styles.optionIndicatorActive : null]} />
              </View>
              <AppText variant="button" color={orderType === 'pickup' ? theme.colors.primary700 : theme.colors.textSecondary}>
                {pickupLabel}
              </AppText>
            </Pressable>
            <Pressable
              style={[styles.option, orderType === 'delivery' ? styles.optionActive : null]}
              onPress={() => onSelectOrderType('delivery')}
              accessibilityRole="radio"
              accessibilityState={{ selected: orderType === 'delivery' }}
              accessibilityLabel={deliveryLabel}
              hitSlop={6}>
              <View style={styles.optionIndicatorWrap}>
                <View style={[styles.optionIndicator, orderType === 'delivery' ? styles.optionIndicatorActive : null]} />
              </View>
              <AppText
                variant="button"
                color={orderType === 'delivery' ? theme.colors.primary700 : theme.colors.textSecondary}>
                {deliveryLabel}
              </AppText>
            </Pressable>
          </View>
        </AppCard>

        <AppCard style={styles.detailsCard}>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            {notesLabel}
          </AppText>
          {orderType === 'delivery' ? (
            <AppInput
              label={deliveryAddressLabel}
              value={deliveryAddress}
              onChangeText={onChangeDeliveryAddress}
              error={deliveryAddressError}
            />
          ) : null}
          <AppInput label={notesLabel} multiline value={notes} onChangeText={onChangeNotes} style={styles.notesInput} />
        </AppCard>
      </ScrollView>

      <View style={[styles.stickyWrap, { paddingBottom: Math.max(bottomInset, theme.spacing.md) }]}>
        <AppCard style={styles.summaryCard}>
          <View style={[styles.summaryRow, mirroredRow(isRTL)]}>
            <AppText>{subtotalLabel}</AppText>
            <AppText>{formatCurrency(subtotal, language)}</AppText>
          </View>
          <View style={[styles.summaryRow, mirroredRow(isRTL)]}>
            <AppText>{discountLabel}</AppText>
            <AppText color={discount > 0 ? theme.colors.success : theme.colors.textSecondary}>
              -{formatCurrency(discount, language)}
            </AppText>
          </View>
          <View style={[styles.totalRow, mirroredRow(isRTL)]}>
            <AppText variant="h3">{totalLabel}</AppText>
            <AppText variant="price" color={theme.colors.primary700}>
              {formatCurrency(total, language)}
            </AppText>
          </View>
          <AppButton
            title={placeOrderLabel}
            onPress={onPlaceOrder}
            loading={loading}
            disabled={!canPlaceOrder}
            testID="checkout-place-order"
          />
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  selectorCard: {
    gap: theme.spacing.sm,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  option: {
    flex: 1,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  optionActive: {
    borderColor: theme.colors.primary400,
    backgroundColor: theme.colors.primary50,
  },
  optionIndicatorWrap: {
    width: 20,
    height: 20,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  optionIndicator: {
    width: 8,
    height: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: 'transparent',
  },
  optionIndicatorActive: {
    backgroundColor: theme.colors.primary500,
  },
  detailsCard: {
    gap: theme.spacing.md,
  },
  notesInput: {
    minHeight: 112,
    textAlignVertical: 'top',
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
  },
  summaryRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
});
