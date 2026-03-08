import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
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
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const payload = useMemo(
    () => ({
      order_type: orderType,
      delivery_address:
        orderType === 'delivery' && deliveryAddress.trim() ? deliveryAddress.trim() : undefined,
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
      Alert.alert(t('common.appName'), t('checkout.deliveryAddressRequired'));
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
    <AppShell>
      <AppText variant="h1">{t('checkout.title')}</AppText>

      <AppCard>
        <View style={styles.row}>
          <Pressable
            style={[styles.option, orderType === 'pickup' ? styles.optionActive : null]}
            onPress={() => setOrderType('pickup')}>
            <AppText>{t('checkout.pickup')}</AppText>
          </Pressable>
          <Pressable
            style={[styles.option, orderType === 'delivery' ? styles.optionActive : null]}
            onPress={() => setOrderType('delivery')}>
            <AppText>{t('checkout.delivery')}</AppText>
          </Pressable>
        </View>
      </AppCard>

      <AppCard>
        {orderType === 'delivery' ? (
          <AppInput
            label={t('checkout.deliveryAddress')}
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
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

      <AppCard>
        {discount > 0 ? (
          <View style={styles.summary}>
            <AppText>{t('common.discount')}</AppText>
            <AppText color={theme.colors.success}>-{formatCurrency(discount, language)}</AppText>
          </View>
        ) : null}
        <View style={styles.summary}>
          <AppText>{t('common.total')}</AppText>
          <AppText variant="price" color={theme.colors.primary700}>
            {formatCurrency(total, language)}
          </AppText>
        </View>
        <AppButton title={t('checkout.placeOrder')} onPress={placeOrder} loading={loading} />
      </AppCard>
    </AppShell>
  );
};

const styles = StyleSheet.create({
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
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
});
