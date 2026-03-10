import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { TopAppBar } from '@/components/TopAppBar';
import { useCartPricing } from '@/hooks/useCartPricing';
import { RootStackParamList } from '@/navigation/types';
import { orderService } from '@/services/orderService';
import { useAuth } from '@/state/AuthContext';
import { useCart } from '@/state/CartContext';
import { theme } from '@/theme';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { getApiErrorMessage } from '@/utils/errors';
import { formatCurrency } from '@/utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

export const CheckoutScreen = ({ navigation }: Props) => {
  const { t, language } = useAppTranslation();
  const { user } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const { discount, total } = useCartPricing(subtotal);
  const [orderType, setOrderType] = useState<'pickup' | 'delivery'>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryAddressError, setDeliveryAddressError] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const isDeliveryAddressValid = orderType === 'pickup' || deliveryAddress.trim().length > 0;
  const canPlaceOrder = Boolean(user) && items.length > 0 && isDeliveryAddressValid && !loading;

  const payload = useMemo(
    () => ({
      order_type: orderType,
      delivery_address: orderType === 'delivery' && deliveryAddress.trim() ? deliveryAddress.trim() : undefined,
      notes: notes.trim() ? notes.trim() : undefined,
      items: items.map((item) => ({
        size_id: item.size.id,
        quantity: item.quantity,
        addon_ids: item.addons.map((addon) => addon.id),
      })),
    }),
    [deliveryAddress, items, notes, orderType],
  );

  const placeOrder = async () => {
    if (!user || items.length === 0) {
      return;
    }

    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      setDeliveryAddressError(t('checkout.deliveryAddressRequired'));
      return;
    }

    try {
      setLoading(true);
      await orderService.create(payload);
      clearCart();
      Alert.alert(t('common.appName'), t('checkout.success'));
      navigation.navigate('MainTabs', { screen: 'PastOrders' });
    } catch (e) {
      Alert.alert(t('common.appName'), getApiErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <TopAppBar title={t('checkout.title')} onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <AppCard>
          <View style={styles.row}>
            <Pressable
              style={[styles.option, orderType === 'pickup' ? styles.optionActive : null]}
              onPress={() => {
                setOrderType('pickup');
                setDeliveryAddressError(undefined);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: orderType === 'pickup' }}
              accessibilityLabel={t('checkout.pickup')}
              hitSlop={6}>
              <AppText>{t('checkout.pickup')}</AppText>
            </Pressable>
            <Pressable
              style={[styles.option, orderType === 'delivery' ? styles.optionActive : null]}
              onPress={() => {
                setOrderType('delivery');
                if (!deliveryAddress.trim()) {
                  setDeliveryAddressError(t('checkout.deliveryAddressRequired'));
                }
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: orderType === 'delivery' }}
              accessibilityLabel={t('checkout.delivery')}
              hitSlop={6}>
              <AppText>{t('checkout.delivery')}</AppText>
            </Pressable>
          </View>
        </AppCard>

        <AppCard>
          {orderType === 'delivery' ? (
            <AppInput
              label={t('checkout.deliveryAddress')}
              value={deliveryAddress}
              onChangeText={(value) => {
                setDeliveryAddress(value);
                if (value.trim().length > 0) {
                  setDeliveryAddressError(undefined);
                }
              }}
              error={deliveryAddressError}
            />
          ) : null}
          <AppInput
            label={t('common.notes')}
            multiline
            value={notes}
            onChangeText={setNotes}
            style={styles.notesInput}
          />
        </AppCard>
      </ScrollView>

      <AppCard style={[styles.summaryCard, { paddingBottom: Math.max(insets.bottom, theme.spacing.md) }]}>
        <View style={styles.summary}>
          <AppText>{t('common.subtotal')}</AppText>
          <AppText>{formatCurrency(subtotal, language)}</AppText>
        </View>
        <View style={styles.summary}>
          <AppText>{t('common.discount')}</AppText>
          <AppText color={discount > 0 ? theme.colors.success : theme.colors.textSecondary}>
            -{formatCurrency(discount, language)}
          </AppText>
        </View>
        <View style={styles.summary}>
          <AppText variant="h3">{t('common.total')}</AppText>
          <AppText variant="price" color={theme.colors.primary700}>
            {formatCurrency(total, language)}
          </AppText>
        </View>
        <AppButton
          title={t('checkout.placeOrder')}
          onPress={placeOrder}
          loading={loading}
          disabled={!canPlaceOrder}
          testID="checkout-place-order"
        />
      </AppCard>
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
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  option: {
    flex: 1,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  optionActive: {
    borderColor: theme.colors.primary500,
    backgroundColor: theme.colors.primary50,
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: theme.spacing.md,
  },
  summaryCard: {
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginHorizontal: 0,
    marginBottom: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
});
