import { OrderRead } from '@/types/api';

type Translate = (key: string, options?: Record<string, unknown>) => string;

export const getDeliveryAddress = (order: OrderRead) =>
  order.delivery_address || order.delivery_address_text || null;

export const isDriverAssignmentStatus = (status: OrderRead['status']) =>
  status === 'ACCEPTED' || status === 'ASSIGNED' || status === 'ASSIGNED_TO_DRIVER' || status === 'READY';

export const needsDriverAssignment = (order: OrderRead) =>
  order.order_type === 'delivery' && isDriverAssignmentStatus(order.status) && !order.assigned_driver_id;

export const isPickupInProgressOrder = (order: OrderRead) =>
  order.order_type === 'pickup' && order.status === 'ACCEPTED';

export const canMarkDeliveryReady = (order: OrderRead) =>
  order.order_type === 'delivery' &&
  (order.status === 'ASSIGNED' || order.status === 'ASSIGNED_TO_DRIVER') &&
  Boolean(order.assigned_driver_id);

export const isReadyDeliveryOrder = (order: OrderRead) =>
  order.order_type === 'delivery' && order.status === 'READY';

export const canMarkDeliveryOutForDelivery = (order: OrderRead) =>
  order.order_type === 'delivery' && order.status === 'READY' && Boolean(order.assigned_driver_id);

export const canMarkDeliveryDelivered = (order: OrderRead) =>
  order.order_type === 'delivery' && order.status === 'OUT_FOR_DELIVERY';

export const isFrontdeskActionableOrder = (order: OrderRead) =>
  order.status === 'NEW' ||
  order.status === 'ACCEPTED' ||
  order.status === 'ASSIGNED' ||
  order.status === 'ASSIGNED_TO_DRIVER' ||
  order.status === 'READY' ||
  order.status === 'OUT_FOR_DELIVERY';

export const canPrintOrder = (order: OrderRead) =>
  order.status === 'ACCEPTED' ||
  order.status === 'ASSIGNED' ||
  order.status === 'ASSIGNED_TO_DRIVER' ||
  order.status === 'READY' ||
  order.status === 'OUT_FOR_DELIVERY';

export const getOrderTypeLabel = (orderType: OrderRead['order_type'], t: Translate) =>
  orderType === 'pickup' ? t('orderType.pickup') : t('orderType.delivery');

export const getOrderStatusLabel = (status: OrderRead['status'], t: Translate) => {
  switch (status) {
    case 'NEW':
      return t('status.NEW');
    case 'ACCEPTED':
      return t('status.ACCEPTED');
    case 'ASSIGNED':
    case 'ASSIGNED_TO_DRIVER':
      return t('status.ASSIGNED_TO_DRIVER');
    case 'READY':
      return t('status.READY');
    case 'OUT_FOR_DELIVERY':
      return t('status.OUT_FOR_DELIVERY');
    case 'DELIVERED':
      return t('status.DELIVERED');
    case 'COMPLETED':
      return t('status.COMPLETED');
    case 'CANCELLED':
      return t('status.CANCELLED');
    default:
      return status;
  }
};
