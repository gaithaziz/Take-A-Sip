import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCartPricing } from '@/hooks/useCartPricing';
import { RootStackParamList } from '@/navigation/types';
import { orderService } from '@/services/orderService';
import { useAuth } from '@/state/AuthContext';
import { useCart } from '@/state/CartContext';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { getApiErrorMessage } from '@/utils/errors';
import { useLanguage } from '@/state/LanguageContext';

import { CheckoutScreenView } from './checkout/CheckoutScreenView';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

export const CheckoutScreen = ({ navigation }: Props) => {
  const { t, language } = useAppTranslation();
  const { isRTL } = useLanguage();
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
    <CheckoutScreenView
      title={t('checkout.title')}
      pickupLabel={t('checkout.pickup')}
      deliveryLabel={t('checkout.delivery')}
      deliveryAddressLabel={t('checkout.deliveryAddress')}
      notesLabel={t('common.notes')}
      subtotalLabel={t('common.subtotal')}
      discountLabel={t('common.discount')}
      totalLabel={t('common.total')}
      placeOrderLabel={t('checkout.placeOrder')}
      language={language}
      isRTL={isRTL}
      orderType={orderType}
      deliveryAddress={deliveryAddress}
      deliveryAddressError={deliveryAddressError}
      notes={notes}
      subtotal={subtotal}
      discount={discount}
      total={total}
      loading={loading}
      canPlaceOrder={canPlaceOrder}
      bottomInset={insets.bottom}
      onBack={() => navigation.goBack()}
      onSelectOrderType={(next) => {
        setOrderType(next);
        if (next === 'pickup') {
          setDeliveryAddressError(undefined);
          return;
        }
        if (!deliveryAddress.trim()) {
          setDeliveryAddressError(t('checkout.deliveryAddressRequired'));
        }
      }}
      onChangeDeliveryAddress={(value) => {
        setDeliveryAddress(value);
        if (value.trim().length > 0) {
          setDeliveryAddressError(undefined);
        }
      }}
      onChangeNotes={setNotes}
      onPlaceOrder={placeOrder}
    />
  );
};
