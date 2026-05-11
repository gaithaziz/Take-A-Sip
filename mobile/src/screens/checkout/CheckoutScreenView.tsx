import { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { MapPressEvent, Marker } from 'react-native-maps';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppText } from '@/components/AppText';
import { TopAppBar } from '@/components/TopAppBar';
import { SavedAddress } from '@/services/addressBook';
import { theme } from '@/theme';
import { LanguageCode } from '@/types/api';
import { formatCurrency } from '@/utils/format';
import { mirroredRow } from '@/utils/layout';

type CheckoutOrderType = 'pickup' | 'delivery';

const DEFAULT_STORE_LOCATION = {
  latitude: 32.551347,
  longitude: 36.017005,
};

type CheckoutScreenViewProps = {
  title: string;
  pickupLabel: string;
  deliveryLabel: string;
  deliveryDetailsLabel: string;
  deliveryAddressLabel: string;
  deliveryLocationLabel: string;
  mapHintLabel: string;
  selectedLocationLabel: string;
  notesLabel: string;
  subtotalLabel: string;
  discountLabel: string;
  deliveryFeeLabel: string;
  estimatedDistanceLabel: string;
  calculatingDeliveryFeeLabel: string;
  deliveryFeeUnavailableLabel: string;
  savedAddressesLabel: string;
  saveThisAddressLabel: string;
  savedAddressAppliedLabel: string;
  noSavedAddressesLabel: string;
  totalLabel: string;
  placeOrderLabel: string;
  language: LanguageCode;
  isRTL: boolean;
  orderType: CheckoutOrderType;
  deliveryAddress: string;
  deliveryAddressError?: string;
  selectedLat: number | null;
  selectedLng: number | null;
  deliveryLocationError?: string;
  deliveryQuoteError?: string;
  deliveryFee: number | null;
  freeDelivery: boolean;
  deliveryDistanceKm: number | null;
  deliveryQuoteLoading: boolean;
  useCurrentLocationLabel: string;
  useCurrentLocationLoadingLabel: string;
  locating: boolean;
  savedAddresses: SavedAddress[];
  notes: string;
  subtotal: number;
  discount: number;
  payableTotal: number;
  loading: boolean;
  canPlaceOrder: boolean;
  bottomInset: number;
  onBack: () => void;
  onSelectOrderType: (next: CheckoutOrderType) => void;
  onChangeDeliveryAddress: (value: string) => void;
  onSelectDeliveryLocation: (lat: number, lng: number) => void;
  onChangeNotes: (value: string) => void;
  onApplySavedAddress: (address: SavedAddress) => void;
  onSaveCurrentAddress: () => void;
  onPlaceOrder: () => void;
  onUseCurrentLocation: () => void;
};

export const CheckoutScreenView = ({
  title,
  pickupLabel,
  deliveryLabel,
  deliveryDetailsLabel,
  deliveryAddressLabel,
  deliveryLocationLabel,
  mapHintLabel,
  selectedLocationLabel,
  notesLabel,
  subtotalLabel,
  discountLabel,
  deliveryFeeLabel,
  estimatedDistanceLabel,
  calculatingDeliveryFeeLabel,
  deliveryFeeUnavailableLabel,
  savedAddressesLabel,
  saveThisAddressLabel,
  savedAddressAppliedLabel,
  noSavedAddressesLabel,
  totalLabel,
  placeOrderLabel,
  language,
  isRTL,
  orderType,
  deliveryAddress,
  deliveryAddressError,
  selectedLat,
  selectedLng,
  deliveryLocationError,
  deliveryQuoteError,
  deliveryFee,
  freeDelivery,
  deliveryDistanceKm,
  deliveryQuoteLoading,
  useCurrentLocationLabel,
  useCurrentLocationLoadingLabel,
  locating,
  savedAddresses,
  notes,
  subtotal,
  discount,
  payableTotal,
  loading,
  canPlaceOrder,
  bottomInset,
  onBack,
  onSelectOrderType,
  onChangeDeliveryAddress,
  onSelectDeliveryLocation,
  onChangeNotes,
  onApplySavedAddress,
  onSaveCurrentAddress,
  onPlaceOrder,
  onUseCurrentLocation,
}: CheckoutScreenViewProps) => {
  const mapRef = useRef<MapView | null>(null);
  const mapCenter = useMemo(
    () => ({
      latitude: selectedLat ?? DEFAULT_STORE_LOCATION.latitude,
      longitude: selectedLng ?? DEFAULT_STORE_LOCATION.longitude,
    }),
    [selectedLat, selectedLng],
  );

  useEffect(() => {
    if (selectedLat === null || selectedLng === null) {
      return;
    }
    mapRef.current?.animateToRegion(
      {
        latitude: selectedLat,
        longitude: selectedLng,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      },
      300,
    );
  }, [selectedLat, selectedLng]);

  const onMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    onSelectDeliveryLocation(Number(latitude.toFixed(6)), Number(longitude.toFixed(6)));
  };

  return (
    <View style={styles.page}>
      <TopAppBar title={title} onBack={onBack} />

      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="never"
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
            <>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                {deliveryDetailsLabel}
              </AppText>
              <AppInput
                label={deliveryAddressLabel}
                value={deliveryAddress}
                onChangeText={onChangeDeliveryAddress}
                error={deliveryAddressError}
              />
              <View style={styles.savedAddressSection}>
                <View style={[styles.summaryRow, mirroredRow(isRTL)]}>
                  <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                    {savedAddressesLabel}
                  </AppText>
                  <AppButton
                    title={saveThisAddressLabel}
                    variant="ghost"
                    fullWidth={false}
                    onPress={onSaveCurrentAddress}
                    disabled={!deliveryAddress.trim() || selectedLat === null || selectedLng === null}
                  />
                </View>
                {savedAddresses.length > 0 ? (
                  <View style={styles.savedAddressList}>
                    {savedAddresses.map((address) => (
                      <Pressable
                        key={address.id}
                        style={styles.savedAddressCard}
                        onPress={() => onApplySavedAddress(address)}
                        accessibilityRole="button"
                        accessibilityLabel={address.label}
                        hitSlop={6}>
                        <AppText variant="bodySmall">{address.label}</AppText>
                        <AppText variant="caption" color={theme.colors.textSecondary}>
                          {address.address}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <AppText variant="caption" color={theme.colors.textSecondary}>
                    {noSavedAddressesLabel}
                  </AppText>
                )}
                {deliveryAddress.trim() && selectedLat !== null && selectedLng !== null ? (
                  <AppText variant="caption" color={theme.colors.primary700}>
                    {savedAddressAppliedLabel}
                  </AppText>
                ) : null}
              </View>
              <View style={styles.mapWrap}>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                  {deliveryLocationLabel}
                </AppText>
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  {mapHintLabel}
                </AppText>
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  initialRegion={{
                    ...mapCenter,
                    latitudeDelta: 0.012,
                    longitudeDelta: 0.012,
                  }}
                  onPress={onMapPress}>
                  {selectedLat !== null && selectedLng !== null ? (
                    <Marker
                      coordinate={{ latitude: selectedLat, longitude: selectedLng }}
                      draggable
                      onDragEnd={(event) => {
                        const { latitude, longitude } = event.nativeEvent.coordinate;
                        onSelectDeliveryLocation(Number(latitude.toFixed(6)), Number(longitude.toFixed(6)));
                      }}
                    />
                  ) : null}
                </MapView>
                {selectedLat !== null && selectedLng !== null ? (
                  <AppText variant="caption" color={theme.colors.textSecondary}>
                    {selectedLocationLabel}: {selectedLat.toFixed(5)}, {selectedLng.toFixed(5)}
                  </AppText>
                ) : null}
                {deliveryLocationError ? (
                  <AppText variant="caption" color={theme.colors.error}>
                    {deliveryLocationError}
                  </AppText>
                ) : null}
                {deliveryQuoteLoading ? (
                  <AppText variant="caption" color={theme.colors.textSecondary}>
                    {calculatingDeliveryFeeLabel}
                  </AppText>
                ) : null}
                {deliveryQuoteError ? (
                  <AppText variant="caption" color={theme.colors.error}>
                    {deliveryQuoteError || deliveryFeeUnavailableLabel}
                  </AppText>
                ) : null}
                {!deliveryQuoteLoading && deliveryFee !== null ? (
                  <View style={[styles.summaryRow, mirroredRow(isRTL)]}>
                    <AppText variant="caption" color={theme.colors.textSecondary}>
                      {estimatedDistanceLabel}: {deliveryDistanceKm?.toFixed(2)} km
                    </AppText>
                    <AppText variant="caption">{formatCurrency(freeDelivery ? 0 : deliveryFee, language)}</AppText>
                  </View>
                ) : null}
              </View>
              <AppButton
                title={locating ? useCurrentLocationLoadingLabel : useCurrentLocationLabel}
                variant="secondary"
                onPress={onUseCurrentLocation}
                disabled={locating}
              />
            </>
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
          {orderType === 'delivery' ? (
            <View style={[styles.summaryRow, mirroredRow(isRTL)]}>
              <AppText>{deliveryFeeLabel}</AppText>
              <AppText color={deliveryFee !== null ? theme.colors.textPrimary : theme.colors.textSecondary}>
                {deliveryFee !== null ? formatCurrency(freeDelivery ? 0 : deliveryFee, language) : calculatingDeliveryFeeLabel}
              </AppText>
            </View>
          ) : null}
          <View style={[styles.totalRow, mirroredRow(isRTL)]}>
            <AppText variant="h3">{totalLabel}</AppText>
            <AppText variant="price" color={theme.colors.primary700}>
              {formatCurrency(payableTotal, language)}
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
  mapWrap: {
    gap: theme.spacing.xs,
  },
  savedAddressSection: {
    gap: theme.spacing.sm,
  },
  savedAddressList: {
    gap: theme.spacing.sm,
  },
  savedAddressCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.secondaryCream,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  map: {
    width: '100%',
    height: 220,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
