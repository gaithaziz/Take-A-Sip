import { OrderRead } from '@/types/api';

export const getCustomerOrderStatusKey = (status: OrderRead['status']) =>
  status === 'ACCEPTED' ? 'orders.statusInProgress' : `status.${status}`;

export const isFinalDeliveredStatus = (status: OrderRead['status']) =>
  status === 'DELIVERED' || status === 'COMPLETED';

export const isOrderRateable = (order: Pick<OrderRead, 'order_type' | 'status'>) => {
  if (order.status === 'CANCELLED') {
    return false;
  }
  if (order.order_type === 'delivery') {
    return isFinalDeliveredStatus(order.status);
  }
  return order.status === 'ACCEPTED' || order.status === 'COMPLETED';
};

export const getOrderRatingAvailabilityKey = (order: Pick<OrderRead, 'order_type'>) =>
  order.order_type === 'delivery'
    ? 'orders.ratingAvailableAfterDelivery'
    : 'orders.ratingAvailableAfterAcceptance';
