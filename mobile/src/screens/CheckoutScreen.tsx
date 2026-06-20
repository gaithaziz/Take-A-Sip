import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { useCartPricing } from '@/hooks/useCartPricing';
import { RootStackParamList } from '@/navigation/types';
import { addressBook, SavedAddress } from '@/services/addressBook';
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
  const { token, user } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const [orderType, setOrderType] = useState<'pickup' | 'delivery'>('pickup');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');
  const { discount, total, freeDelivery } = useCartPricing(items, subtotal, orderType);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number | null>(null);
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState<number | null>(null);
  const [deliveryQuoteError, setDeliveryQuoteError] = useState<string | undefined>(undefined);
  const [deliveryQuoteLoading, setDeliveryQuoteLoading] = useState(false);
  const [deliveryAddressError, setDeliveryAddressError] = useState<string | undefined>(undefined);
  const [deliveryLocationError, setDeliveryLocationError] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const insets = useSafeAreaInsets();

  const hasDeliveryAddress = deliveryAddress.trim().length > 0;
  const hasDeliveryCoords = deliveryCoords !== null;
  const hasDeliveryQuote = orderType === 'pickup' || (!deliveryQuoteLoading && deliveryFee !== null);
  const isDeliveryValid = orderType === 'pickup' || (hasDeliveryAddress && hasDeliveryCoords && hasDeliveryQuote);
  const isAuthenticatedClient = Boolean(token) && user?.role === 'CLIENT';
  const canPlaceOrder = isAuthenticatedClient && items.length > 0 && isDeliveryValid && !loading;
  const effectiveDeliveryFee = orderType === 'delivery' && freeDelivery ? 0 : deliveryFee;
  const payableTotal = total + (orderType === 'delivery' ? effectiveDeliveryFee ?? 0 : 0);

  useEffect(() => {
    if (!user?.id) {
      setSavedAddresses([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const entries = await addressBook.list(user.id);
      if (!cancelled) {
        setSavedAddresses(entries);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (orderType !== 'delivery' || !deliveryCoords) {
      setDeliveryFee(null);
      setDeliveryDistanceKm(null);
      setDeliveryQuoteError(undefined);
      setDeliveryQuoteLoading(false);
      return;
    }

    let cancelled = false;

    const loadDeliveryQuote = async () => {
      try {
        setDeliveryFee(null);
        setDeliveryDistanceKm(null);
        setDeliveryQuoteLoading(true);
        setDeliveryQuoteError(undefined);
        const quote = await orderService.getDeliveryQuote({
          delivery_lat: deliveryCoords.lat,
          delivery_lng: deliveryCoords.lng,
        });
        if (cancelled) {
          return;
        }
        const fee = Number(quote.delivery_fee);
        const distance = Number(quote.delivery_distance_km);
        setDeliveryFee(Number.isFinite(fee) ? fee : null);
        setDeliveryDistanceKm(Number.isFinite(distance) ? distance : null);
      } catch (e) {
        if (cancelled) {
          return;
        }
        setDeliveryFee(null);
        setDeliveryDistanceKm(null);
        setDeliveryQuoteError(getApiErrorMessage(e, t));
      } finally {
        if (!cancelled) {
          setDeliveryQuoteLoading(false);
        }
      }
    };

    void loadDeliveryQuote();

    return () => {
      cancelled = true;
    };
  }, [deliveryCoords, orderType, t]);

  const payload = useMemo(
    () => ({
      order_type: orderType,
      payment_method: paymentMethod,
      delivery_address: orderType === 'delivery' && deliveryAddress.trim() ? deliveryAddress.trim() : undefined,
      delivery_address_text: orderType === 'delivery' && deliveryAddress.trim() ? deliveryAddress.trim() : undefined,
      delivery_lat: orderType === 'delivery' && hasDeliveryCoords ? deliveryCoords.lat : undefined,
      delivery_lng: orderType === 'delivery' && hasDeliveryCoords ? deliveryCoords.lng : undefined,
      notes: notes.trim() ? notes.trim() : undefined,
      items: items.map((item) => ({
        size_id: item.size.id,
        quantity: item.quantity,
        addon_ids: item.addons.map((addon) => addon.id),
      })),
    }),
    [deliveryAddress, hasDeliveryCoords, deliveryCoords, items, notes, orderType, paymentMethod],
  );

  const placeOrder = async () => {
    if (!isAuthenticatedClient || !user || items.length === 0) {
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
    if (orderType === 'delivery' && !hasDeliveryQuote) {
      setDeliveryLocationError(t('checkout.deliveryFeeUnavailable'));
    }
    if (orderType === 'delivery' && (!deliveryAddress.trim() || !hasDeliveryCoords)) {
      return;
    }
    if (orderType === 'delivery' && !hasDeliveryQuote) {
      return;
    }

    try {
      setLoading(true);
      await orderService.create(payload);
      if (orderType === 'delivery' && user?.id && deliveryAddress.trim() && deliveryCoords) {
        const nextAddresses = await addressBook.save(user.id, {
          label: deliveryAddress.trim(),
          address: deliveryAddress.trim(),
          lat: deliveryCoords.lat,
          lng: deliveryCoords.lng,
        });
        setSavedAddresses(nextAddresses);
      }
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
      setDeliveryFee(null);
      setDeliveryDistanceKm(null);
      setDeliveryQuoteError(undefined);
      setDeliveryCoords({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
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
      deliveryDetailsLabel={t('checkout.delivery')}
      deliveryAddressLabel={t('checkout.deliveryAddress')}
      deliveryLocationLabel={t('checkout.deliveryLocation')}
      mapHintLabel={t('checkout.selectOnMap')}
      selectedLocationLabel={t('checkout.selectedLocation')}
      notesLabel={t('common.notes')}
      subtotalLabel={t('common.subtotal')}
      discountLabel={t('common.discount')}
      deliveryFeeLabel={t('checkout.deliveryFee')}
      estimatedDistanceLabel={t('checkout.estimatedDistance')}
      calculatingDeliveryFeeLabel={t('checkout.calculatingDeliveryFee')}
      deliveryFeeUnavailableLabel={t('checkout.deliveryFeeUnavailable')}
      savedAddressesLabel={t('checkout.savedAddresses')}
      saveThisAddressLabel={t('checkout.saveThisAddress')}
      savedAddressAppliedLabel={t('checkout.savedAddressHint')}
      noSavedAddressesLabel={t('checkout.noSavedAddresses')}
      totalLabel={t('common.total')}
      placeOrderLabel={t('checkout.placeOrder')}
      paymentMethodLabel={t('checkout.paymentMethod')}
      cashLabel={t('checkout.cash')}
      cardLabel={t('checkout.card')}
      cashHintLabel={t('checkout.cashHint')}
      cardHintLabel={t('checkout.cardHint')}
      language={language}
      isRTL={isRTL}
      orderType={orderType}
      paymentMethod={paymentMethod}
      deliveryAddress={deliveryAddress}
      deliveryAddressError={deliveryAddressError}
      selectedLat={deliveryCoords?.lat ?? null}
      selectedLng={deliveryCoords?.lng ?? null}
      deliveryLocationError={deliveryLocationError}
      deliveryQuoteError={deliveryQuoteError}
      deliveryFee={deliveryFee}
      freeDelivery={freeDelivery}
      deliveryDistanceKm={deliveryDistanceKm}
      deliveryQuoteLoading={deliveryQuoteLoading}
      useCurrentLocationLabel={t('checkout.useCurrentLocation')}
      useCurrentLocationLoadingLabel={t('checkout.locating')}
      locating={locating}
      savedAddresses={savedAddresses}
      notes={notes}
      subtotal={subtotal}
      discount={discount}
      payableTotal={payableTotal}
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
        setDeliveryFee(null);
        setDeliveryDistanceKm(null);
        setDeliveryQuoteError(undefined);
        if (!deliveryAddress.trim()) {
          setDeliveryAddressError(t('checkout.deliveryAddressRequired'));
        }
        if (!hasDeliveryCoords) {
          setDeliveryLocationError(t('checkout.deliveryLocationRequired'));
        }
      }}
      onSelectPaymentMethod={setPaymentMethod}
      onChangeDeliveryAddress={(value) => {
        setDeliveryAddress(value);
        if (value.trim().length > 0) {
          setDeliveryAddressError(undefined);
        }
      }}
      onSelectDeliveryLocation={(lat, lng) => {
        setDeliveryFee(null);
        setDeliveryDistanceKm(null);
        setDeliveryQuoteError(undefined);
        setDeliveryCoords({ lat, lng });
        setDeliveryLocationError(undefined);
      }}
      onChangeNotes={setNotes}
      onApplySavedAddress={(address) => {
        setDeliveryAddress(address.address);
        setDeliveryCoords({ lat: address.lat, lng: address.lng });
        setDeliveryAddressError(undefined);
        setDeliveryLocationError(undefined);
        setDeliveryQuoteError(undefined);
      }}
      onSaveCurrentAddress={() => {
        if (!user?.id || !deliveryCoords || !deliveryAddress.trim()) {
          return;
        }
        void (async () => {
          const nextAddresses = await addressBook.save(user.id, {
            label: deliveryAddress.trim(),
            address: deliveryAddress.trim(),
            lat: deliveryCoords.lat,
            lng: deliveryCoords.lng,
          });
          setSavedAddresses(nextAddresses);
          Alert.alert(t('common.appName'), t('checkout.addressSaved'));
        })();
      }}
      onPlaceOrder={placeOrder}
      onUseCurrentLocation={() => void useCurrentLocation()}
    />
  );
};
