import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCartPricing } from '@/hooks/useCartPricing';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { RootStackParamList } from '@/navigation/types';
import { useCart } from '@/state/CartContext';
import { useLanguage } from '@/state/LanguageContext';

import { CartScreenView } from './cart/CartScreenView';

type Props = NativeStackScreenProps<RootStackParamList, 'Cart'>;

export const CartScreen = ({ navigation }: Props) => {
  const { t, language } = useAppTranslation();
  const { isRTL } = useLanguage();
  const { items, removeItem, updateQuantity, subtotal } = useCart();
  const { discount, total, appliedPromotion } = useCartPricing(subtotal);
  const insets = useSafeAreaInsets();

  return (
    <CartScreenView
      items={items}
      subtotal={subtotal}
      discount={discount}
      total={total}
      language={language}
      isRTL={isRTL}
      title={t('cart.title')}
      removeItemLabel={t('cart.removeItem')}
      checkoutLabel={t('cart.checkout')}
      emptyTitle={t('cart.emptyTitle')}
      emptySubtitle={t('cart.emptySubtitle')}
      subtotalLabel={t('common.subtotal')}
      discountLabel={t('common.discount')}
      totalLabel={t('common.total')}
      offerAppliedLabel={t('cart.offerApplied')}
      firstTimeOfferAppliedLabel={t('cart.firstTimeOfferApplied')}
      appliedPromotionType={appliedPromotion?.type ?? null}
      bottomInset={insets.bottom}
      onBack={() => navigation.goBack()}
      onRemoveItem={removeItem}
      onUpdateQuantity={updateQuantity}
      onCheckout={() => navigation.navigate('Checkout')}
    />
  );
};
