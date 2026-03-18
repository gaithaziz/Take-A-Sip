import { OrderRead } from '@/types/api';

type Translate = (key: string, options?: Record<string, unknown>) => string;

export const getDeliveryAddress = (order: OrderRead) =>
  order.delivery_address || order.delivery_address_text || null;

export const isDriverAssignmentStatus = (status: OrderRead['status']) =>
  status === 'ACCEPTED' || status === 'ASSIGNED' || status === 'ASSIGNED_TO_DRIVER';

export const needsDriverAssignment = (order: OrderRead) =>
  order.order_type === 'delivery' && isDriverAssignmentStatus(order.status) && !order.assigned_driver_id;

export const isFrontdeskActionableOrder = (order: OrderRead) => order.status === 'NEW' || needsDriverAssignment(order);

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
