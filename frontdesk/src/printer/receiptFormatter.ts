import { OrderRead } from '@/types/api';
import { getDeliveryAddress } from '@/utils/orderPresentation';
import { ReceiptArabicLookup } from '@/printer/receiptLocalization';

const money = (value: string | number) => `${Number(value).toFixed(2)} JOD`;

type ReceiptTextOptions = {
  isArabic?: boolean;
  shopName?: string;
  shopNameArabic?: string;
  arabicLookup?: ReceiptArabicLookup;
};

export const buildReceiptText = (order: OrderRead, options?: ReceiptTextOptions) => {
  const isArabic = Boolean(options?.isArabic);
  const arabicLookup = options?.arabicLookup;
  const divider = '--------------------------';
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const itemsTotal = order.items.reduce((sum, item) => {
    const lineBase = Number(item.price_snapshot) * item.quantity;
    const addonsTotal =
      item.addons.reduce((addonSum, addon) => addonSum + Number(addon.price_snapshot), 0) * item.quantity;
    return sum + lineBase + addonsTotal;
  }, 0);
  const deliveryFee = order.order_type === 'delivery' ? Number(order.delivery_fee ?? 0) : 0;
  const subtotal = Number(order.subtotal_amount ?? itemsTotal);
  const discount = Number(order.discount_amount ?? 0);
  const totalPrice = Number(order.total_amount ?? subtotal - discount + deliveryFee);
  const createdAt = new Date(order.created_at);
  const dateText = Number.isNaN(createdAt.getTime())
    ? new Date().toLocaleString(isArabic ? 'ar-JO' : 'en-US')
    : createdAt.toLocaleString(isArabic ? 'ar-JO' : 'en-US');
  const orderTypeText = isArabic
    ? order.order_type === 'pickup'
      ? 'استلام من الفرع'
      : 'توصيل'
    : order.order_type === 'pickup'
      ? 'Pickup'
      : 'Delivery';
  const address = getDeliveryAddress(order);
  const shopName = options?.shopName?.trim() || 'TAKE A SIP';
  const shopNameArabic = options?.shopNameArabic?.trim() || 'خذلك شفة';

  const getItemName = (item: OrderRead['items'][number]) =>
    isArabic
      ? (item.item_id_snapshot ? arabicLookup?.itemNamesById[item.item_id_snapshot] : undefined) ||
        item.item_name_snapshot
      : item.item_name_snapshot;

  const getSizeName = (item: OrderRead['items'][number]) =>
    isArabic
      ? (item.size_id_snapshot ? arabicLookup?.sizeNamesById[item.size_id_snapshot] : undefined) || item.size_snapshot
      : item.size_snapshot;

  const getAddonName = (addon: OrderRead['items'][number]['addons'][number]) =>
    isArabic
      ? (addon.addon_id_snapshot ? arabicLookup?.addonNamesById[addon.addon_id_snapshot] : undefined) ||
        addon.addon_name_snapshot
      : addon.addon_name_snapshot;

  const lines: string[] = [
    isArabic ? shopNameArabic : shopName,
    divider,
    '',
    isArabic ? `رقم الطلب: ${order.order_number}` : `Order #${order.order_number}`,
    isArabic ? `التاريخ: ${dateText}` : `Date: ${dateText}`,
    '',
    isArabic ? `العميل: ${order.customer_name || 'غير متوفر'}` : `Customer: ${order.customer_name || 'N/A'}`,
    isArabic ? `الهاتف: ${order.customer_phone || 'غير متوفر'}` : `Phone: ${order.customer_phone || 'N/A'}`,
    '',
    isArabic ? `نوع الطلب: ${orderTypeText}` : `Type: ${orderTypeText}`,
    order.order_type === 'delivery'
      ? isArabic
        ? `العنوان: ${address || 'غير متوفر'}`
        : `Address: ${address || 'N/A'}`
      : '',
    order.notes ? (isArabic ? `ملاحظات: ${order.notes}` : `Notes: ${order.notes}`) : isArabic ? 'ملاحظات: -' : 'Notes: -',
    '',
    divider,
    '',
  ];

  order.items.forEach((item) => {
    lines.push(`${item.quantity}x ${getItemName(item)} (${getSizeName(item)}) (${money(item.price_snapshot)})`);
    item.addons.forEach((addon) => {
      lines.push(`   + ${getAddonName(addon)} (${money(addon.price_snapshot)})`);
    });
    lines.push('');
  });

  lines.push(divider);
  lines.push('');
  lines.push(isArabic ? `إجمالي العناصر: ${totalItems}` : `Total Items: ${totalItems}`);
  lines.push(isArabic ? `مجموع العناصر: ${money(subtotal)}` : `Items Total: ${money(subtotal)}`);
  if (discount > 0) {
    lines.push(isArabic ? `الخصم: -${money(discount)}` : `Discount: -${money(discount)}`);
    if (order.applied_promotion_title_en || order.applied_promotion_title_ar) {
      const promotionTitle = isArabic
        ? order.applied_promotion_title_ar || order.applied_promotion_title_en
        : order.applied_promotion_title_en || order.applied_promotion_title_ar;
      lines.push(isArabic ? `العرض: ${promotionTitle}` : `Offer: ${promotionTitle}`);
    }
  }
  if (order.order_type === 'delivery') {
    lines.push(isArabic ? `رسوم التوصيل: ${money(deliveryFee)}` : `Delivery Fee: ${money(deliveryFee)}`);
  }
  lines.push(isArabic ? `السعر الإجمالي: ${money(totalPrice)}` : `Total Price: ${money(totalPrice)}`);
  lines.push(divider);
  lines.push(isArabic ? 'شكرا لكم' : 'Thank you');

  return lines.join('\n');
};
