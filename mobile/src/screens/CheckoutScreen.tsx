import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

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
  const [deliveryLat, setDeliveryLat] = useState('');
  const [deliveryLng, setDeliveryLng] = useState('');
  const [deliveryAddressError, setDeliveryAddressError] = useState<string | undefined>(undefined);
  const [deliveryLocationError, setDeliveryLocationError] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const insets = useSafeAreaInsets();

  const hasDeliveryAddress = deliveryAddress.trim().length > 0;
  const latValue = Number(deliveryLat);
  const lngValue = Number(deliveryLng);
  const hasDeliveryCoords =
    Number.isFinite(latValue) &&
    Number.isFinite(lngValue) &&
    latValue >= -90 &&
    latValue <= 90 &&
    lngValue >= -180 &&
    lngValue <= 180;
  const isDeliveryValid = orderType === 'pickup' || (hasDeliveryAddress && hasDeliveryCoords);
  const canPlaceOrder = Boolean(user) && items.length > 0 && isDeliveryValid && !loading;

  const payload = useMemo(
    () => ({
      order_type: orderType,
      delivery_address: orderType === 'delivery' && deliveryAddress.trim() ? deliveryAddress.trim() : undefined,
      delivery_address_text: orderType === 'delivery' && deliveryAddress.trim() ? deliveryAddress.trim() : undefined,
      delivery_lat: orderType === 'delivery' && hasDeliveryCoords ? latValue : undefined,
      delivery_lng: orderType === 'delivery' && hasDeliveryCoords ? lngValue : undefined,
      notes: notes.trim() ? notes.trim() : undefined,
      items: items.map((item) => ({
        size_id: item.size.id,
        quantity: item.quantity,
        addon_ids: item.addons.map((addon) => addon.id),
      })),
    }),
    [deliveryAddress, hasDeliveryCoords, items, latValue, lngValue, notes, orderType],
  );

  const placeOrder = async () => {
    if (!user || items.length === 0) {
      return;
    }

    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      setDeliveryAddressError(t('checkout.deliveryAddressRequired'));
    } else {
      setDeliveryAddressError(undefined);
    }
    if (orderType === 'delivery' && !hasDeliveryCoords) {
      setDeliveryLocationError(t('checkout.deliveryLocationRequired'));
    } else {
      setDeliveryLocationError(undefined);
    }
    if (orderType === 'delivery' && (!deliveryAddress.trim() || !hasDeliveryCoords)) {
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

  const useCurrentLocation = async () => {
    try {
      setLocating(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(t('common.appName'), t('checkout.locationPermissionRequired'));
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setDeliveryLat(String(lat.toFixed(6)));
      setDeliveryLng(String(lng.toFixed(6)));
      setDeliveryLocationError(undefined);

      const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (geocode.length > 0) {
        const top = geocode[0];
        const parts = [top.name, top.street, top.city, top.region, top.country].filter(Boolean);
        if (parts.length > 0) {
          setDeliveryAddress(parts.join(', '));
          setDeliveryAddressError(undefined);
        }
      }
    } catch {
      Alert.alert(t('common.appName'), t('checkout.locationFetchFailed'));
    } finally {
      setLocating(false);
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
      deliveryLatLabel={t('checkout.deliveryLat')}
      deliveryLngLabel={t('checkout.deliveryLng')}
      deliveryLat={deliveryLat}
      deliveryLng={deliveryLng}
      deliveryLocationError={deliveryLocationError}
      useCurrentLocationLabel={t('checkout.useCurrentLocation')}
      useCurrentLocationLoadingLabel={t('checkout.locating')}
      locating={locating}
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
          setDeliveryLocationError(undefined);
          return;
        }
        if (!deliveryAddress.trim()) {
          setDeliveryAddressError(t('checkout.deliveryAddressRequired'));
        }
        if (!hasDeliveryCoords) {
          setDeliveryLocationError(t('checkout.deliveryLocationRequired'));
        }
      }}
      onChangeDeliveryAddress={(value) => {
        setDeliveryAddress(value);
        if (value.trim().length > 0) {
          setDeliveryAddressError(undefined);
        }
      }}
      onChangeDeliveryLat={(value) => {
        setDeliveryLat(value);
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed >= -90 && parsed <= 90 && Number.isFinite(Number(deliveryLng))) {
          setDeliveryLocationError(undefined);
        }
      }}
      onChangeDeliveryLng={(value) => {
        setDeliveryLng(value);
        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed >= -180 && parsed <= 180 && Number.isFinite(Number(deliveryLat))) {
          setDeliveryLocationError(undefined);
        }
      }}
      onChangeNotes={setNotes}
      onPlaceOrder={placeOrder}
      onUseCurrentLocation={() => void useCurrentLocation()}
    />
  );
};
