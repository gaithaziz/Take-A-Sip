import { OrderRead } from '@/types/api';

const money = (value: string | number) => `${Number(value).toFixed(2)} JOD`;

export const buildReceiptText = (order: OrderRead) => {
  const divider = '--------------------------';
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = order.items.reduce((sum, item) => {
    const lineBase = Number(item.price_snapshot) * item.quantity;
    const addonsTotal = item.addons.reduce((addonSum, addon) => addonSum + Number(addon.price_snapshot), 0);
    return sum + lineBase + addonsTotal;
  }, 0);

  const lines: string[] = [
    'COFFEE SHOP',
    divider,
    '',
    `Order #${order.order_number}`,
    '',
    `Customer: ${order.customer_name || 'N/A'}`,
    `Phone: ${order.customer_phone || 'N/A'}`,
    '',
    `Type: ${order.order_type === 'pickup' ? 'Pickup' : 'Delivery'}`,
    order.order_type === 'delivery' ? `Address: ${order.delivery_address || 'N/A'}` : '',
    order.notes ? `Notes: ${order.notes}` : 'Notes: -',
    '',
    divider,
    '',
  ];

  order.items.forEach((item) => {
    lines.push(`${item.quantity}x ${item.item_name_snapshot} (${item.size_snapshot}) (${money(item.price_snapshot)})`);
    item.addons.forEach((addon) => {
      lines.push(`   + ${addon.addon_name_snapshot} (${money(addon.price_snapshot)})`);
    });
    lines.push('');
  });

  lines.push(divider);
  lines.push('');
  lines.push(`Total Items: ${totalItems}`);
  lines.push(`Total Price: ${money(totalPrice)}`);
  lines.push(divider);
  lines.push('Thank you');

  return lines.join('\n');
};
