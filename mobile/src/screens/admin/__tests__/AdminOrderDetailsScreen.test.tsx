import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { AdminOrderDetailsScreen } from '@/screens/admin/AdminOrderDetailsScreen';
import { orderService } from '@/services/orderService';

const mockT = (key: string) => {
  const map: Record<string, string> = {
    'admin.orderDetailsTitle': 'Order details',
    'admin.manageOrderStatus': 'Manage order status',
    'admin.currentOrderStatus': 'Current status',
    'admin.acceptOrder': 'Accept order',
    'admin.completeOrder': 'Complete order',
    'admin.markOrderReady': 'Mark order ready',
    'admin.markOutForDelivery': 'Mark out for delivery',
    'admin.markDelivered': 'Mark delivered',
    'admin.cancelOrder': 'Cancel order',
    'admin.confirmOrderActionTitle': 'Confirm order action',
    'admin.confirmOrderActionMessage': 'Confirm action?',
    'admin.noStatusActionsAvailable': 'No actions available',
    'admin.noActiveDrivers': 'No active drivers',
    'admin.assignDriverPrompt': 'Choose a driver for this order.',
    'admin.assignDriverAction': 'Assign driver',
    'admin.customerDetails': 'Customer details',
    'admin.customerName': 'Customer name',
    'admin.userId': 'User ID',
    'admin.fulfillmentDetails': 'Fulfillment details',
    'admin.assignedDriver': 'Assigned driver',
    'admin.driverPhone': 'Driver phone',
    'admin.driverId': 'Driver ID',
    'admin.assignedAt': 'Assigned at',
    'admin.deliveryDistance': 'Delivery distance',
    'admin.deliveryCoordinates': 'Delivery coordinates',
    'admin.mapsUrl': 'Maps URL',
    'admin.appliedPromotion': 'Applied promotion',
    'admin.promotionId': 'Promotion ID',
    'admin.itemId': 'Product ID',
    'admin.orderVariant': 'Variant',
    'admin.variantId': 'Variant ID',
    'admin.unitPrice': 'Unit price',
    'admin.addons': 'Add-ons',
    'admin.lineTotal': 'Line total',
    'admin.auditDetails': 'Audit details',
    'admin.orderId': 'Order ID',
    'admin.deliveryDistanceBandId': 'Distance band ID',
    'admin.rating': 'Rating',
    'admin.ratingAt': 'Rated at',
    'admin.orderTypeDelivery': 'Delivery',
    'admin.none': 'None',
    'common.subtotal': 'Subtotal',
    'common.discount': 'Discount',
    'common.total': 'Total',
    'common.notes': 'Notes',
    'common.goBack': 'Go back',
    'common.error': 'Error',
    'common.retry': 'Retry',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'errors.generic': 'Something went wrong',
    'orders.summaryTitle': 'Order summary',
    'orders.itemsTitle': 'Items',
    'orders.orderType': 'Order type',
    'orders.deliveryAddress': 'Delivery address',
    'orders.paymentMethod': 'Payment method',
    'orders.paymentCard': 'Card terminal when receiving',
    'orders.completedAt': 'Completed at',
    'orders.placedAt': 'Placed at',
    'checkout.delivery': 'Delivery',
    'checkout.deliveryFee': 'Delivery fee',
    'status.NEW': 'New',
    'status.ACCEPTED': 'Accepted',
    'status.ASSIGNED': 'Assigned',
    'status.READY': 'Ready',
    'status.OUT_FOR_DELIVERY': 'Out for delivery',
    'status.DELIVERED': 'Delivered',
    'status.COMPLETED': 'Completed',
    'status.CANCELLED': 'Cancelled',
    'profile.phone': 'Phone',
  };
  return map[key] ?? key;
};

const mockOrder = {
  id: 'order-1',
  order_number: 202,
  user_id: 'user-1',
  customer_name: 'Ghaith Aldiabat',
  customer_phone: '+962790000000',
  delivery_address: 'Raw address',
  delivery_address_text: 'Amman, Sweifieh',
  delivery_latitude: '31.9500',
  delivery_longitude: '35.9200',
  delivery_distance_km: '4.2',
  delivery_fee: '1.50',
  delivery_distance_band_id: 'band-1',
  subtotal_amount: '7.00',
  discount_amount: '2.00',
  total_amount: '6.50',
  applied_promotion_id: 'promo-1',
  applied_promotion_title_en: 'Free waffle',
  applied_promotion_title_ar: 'وافل مجاني',
  assigned_driver_id: 'driver-1',
  assigned_driver_name: 'Driver One',
  assigned_driver_phone: '+962780000000',
  assigned_at: '2026-06-16T12:10:00.000Z',
  completed_at: null,
  google_maps_url: 'https://maps.example/order-1',
  status: 'NEW',
  order_type: 'delivery',
  payment_method: 'CARD',
  created_at: '2026-06-16T12:00:00.000Z',
  notes: 'Please call on arrival',
  items: [
    {
      id: 'line-1',
      item_id_snapshot: 'item-1',
      size_id_snapshot: 'size-1',
      item_name_snapshot: 'Latte',
      size_snapshot: 'Large',
      price_snapshot: '5.00',
      quantity: 1,
      addons: [
        {
          id: 'addon-line-1',
          addon_id_snapshot: 'addon-1',
          addon_name_snapshot: 'Extra shot',
          price_snapshot: '2.00',
        },
      ],
    },
  ],
  rating: {
    id: 'rating-1',
    order_id: 'order-1',
    user_id: 'user-1',
    stars: 5,
    note: 'Great',
    created_at: '2026-06-16T13:00:00.000Z',
  },
};

jest.mock('@/hooks/useAppTranslation', () => ({
  useAppTranslation: () => ({
    language: 'en',
    isRTL: false,
    t: mockT,
  }),
}));

jest.mock('@/state/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    isRTL: false,
    toggleLanguage: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/components/AppShell', () => ({
  AppShell: ({ children }: { children: any }) => children,
}));

jest.mock('@/components/TopAppBar', () => {
  const { Text } = require('react-native');
  return {
    TopAppBar: ({ title }: { title: string }) => <Text>{title}</Text>,
  };
});

jest.mock('@/components/AppButton', () => {
  const { Pressable, Text } = require('react-native');
  return {
    AppButton: ({ title, onPress, disabled, loading, testID }: { title: string; onPress: () => void; disabled?: boolean; loading?: boolean; testID?: string }) => (
      <Pressable testID={testID} onPress={onPress} disabled={disabled || loading} accessibilityState={{ disabled: disabled || loading }}>
        <Text>{title}</Text>
      </Pressable>
    ),
  };
});

jest.mock('@/services/orderService', () => ({
  orderService: {
    getById: jest.fn(),
    accept: jest.fn(),
    updateStatus: jest.fn(),
  },
}));

const mockListDrivers = jest.fn();
const mockAssignDriverToOrder = jest.fn();

jest.mock('@/services/adminService', () => ({
  adminService: {
    listDrivers: (...args: unknown[]) => mockListDrivers(...args),
    assignDriverToOrder: (...args: unknown[]) => mockAssignDriverToOrder(...args),
  },
}));

jest.mock('@/services/menuService', () => ({
  menuService: {
    getMenu: jest.fn(async () => ({
      sections: [
        {
          id: 'section-1',
          name_en: 'Drinks',
          name_ar: 'مشروبات',
          image_url: null,
          is_active: true,
          sort_order: 0,
          items: [
            {
              id: 'item-1',
              section_id: 'section-1',
              name_en: 'Latte',
              name_ar: 'لاتيه',
              image_url: null,
              description_en: null,
              description_ar: null,
              sort_order: 0,
              is_active: true,
              item_types: [
                {
                  id: 'type-1',
                  item_id: 'item-1',
                  name_en: 'Hot',
                  name_ar: 'ساخن',
                  image_url: null,
                  sort_order: 0,
                  is_active: true,
                  sizes: [
                    {
                      id: 'size-1',
                      type_id: 'type-1',
                      name_en: 'Large',
                      name_ar: 'كبير',
                      image_url: null,
                      price: '5.00',
                      sort_order: 0,
                      is_active: true,
                      addons: [
                        {
                          id: 'addon-1',
                          size_id: 'size-1',
                          name_en: 'Extra shot',
                          name_ar: 'جرعة إضافية',
                          image_url: null,
                          price: '2.00',
                          sort_order: 0,
                          is_active: true,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    })),
  },
}));

describe('AdminOrderDetailsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListDrivers.mockResolvedValue({
      users: [
        {
          id: 'driver-2',
          first_name: 'Driver',
          last_name: 'Two',
          phone_number: '+962790000002',
          role: 'DRIVER',
          is_active: true,
          is_banned: false,
        },
      ],
    });
    mockAssignDriverToOrder.mockResolvedValue({ id: 'order-1', status: 'ASSIGNED' });
    (orderService.accept as jest.Mock).mockResolvedValue({ id: 'order-1', status: 'ACCEPTED' });
    (orderService.updateStatus as jest.Mock).mockResolvedValue({ id: 'order-1', status: 'READY' });
  });

  it('renders full admin order details', async () => {
    (orderService.getById as jest.Mock).mockResolvedValue(mockOrder);

    const { getByText, queryByText } = render(
      <AdminOrderDetailsScreen
        navigation={{ goBack: jest.fn() } as never}
        route={{ key: 'AdminOrderDetails', name: 'AdminOrderDetails', params: { orderId: 'order-1' } } as never}
      />,
    );

    await waitFor(() => {
      expect(getByText('#202')).toBeTruthy();
    });

    expect(getByText('Ghaith Aldiabat')).toBeTruthy();
    expect(getByText('Driver One')).toBeTruthy();
    expect(getByText('Amman, Sweifieh')).toBeTruthy();
    expect(getByText('Free waffle')).toBeTruthy();
    expect(getByText('Latte')).toBeTruthy();
    expect(getByText('Extra shot:')).toBeTruthy();
    expect(getByText('5/5')).toBeTruthy();
    expect(getByText('Card terminal when receiving')).toBeTruthy();
    expect(queryByText('user-1')).toBeNull();
    expect(queryByText('driver-1')).toBeNull();
    expect(queryByText('promo-1')).toBeNull();
    expect(queryByText('item-1')).toBeNull();
    expect(queryByText('size-1')).toBeNull();
    expect(queryByText('band-1')).toBeNull();
    expect(queryByText('31.9500, 35.9200')).toBeNull();
    expect(queryByText('https://maps.example/order-1')).toBeNull();
    expect(orderService.getById).toHaveBeenCalledWith('order-1');
  });

  it('assigns an active driver from an accepted delivery order', async () => {
    const acceptedOrder = {
      ...mockOrder,
      status: 'ACCEPTED',
      assigned_driver_id: null,
      assigned_driver_name: null,
      assigned_driver_phone: null,
    };
    const assignedOrder = {
      ...acceptedOrder,
      status: 'ASSIGNED',
      assigned_driver_id: 'driver-2',
      assigned_driver_name: 'Driver Two',
    };
    (orderService.getById as jest.Mock)
      .mockResolvedValueOnce(acceptedOrder)
      .mockResolvedValueOnce(assignedOrder);
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.text === 'Confirm')?.onPress?.();
    });

    const { findByText } = render(
      <AdminOrderDetailsScreen
        navigation={{ goBack: jest.fn() } as never}
        route={{ key: 'AdminOrderDetails', name: 'AdminOrderDetails', params: { orderId: 'order-1' } } as never}
      />,
    );

    fireEvent.press(await findByText('Driver Two'));

    await waitFor(() => {
      expect(mockAssignDriverToOrder).toHaveBeenCalledWith('order-1', 'driver-2');
      expect(orderService.getById).toHaveBeenCalledTimes(2);
    });
  });

  it('allows the admin to move a ready delivery out for delivery', async () => {
    (orderService.getById as jest.Mock)
      .mockResolvedValueOnce({ ...mockOrder, status: 'READY' })
      .mockResolvedValueOnce({ ...mockOrder, status: 'OUT_FOR_DELIVERY' });
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.text === 'Confirm')?.onPress?.();
    });

    const { findByText } = render(
      <AdminOrderDetailsScreen
        navigation={{ goBack: jest.fn() } as never}
        route={{ key: 'AdminOrderDetails', name: 'AdminOrderDetails', params: { orderId: 'order-1' } } as never}
      />,
    );

    fireEvent.press(await findByText('Mark out for delivery'));

    await waitFor(() => {
      expect(orderService.updateStatus).toHaveBeenCalledWith('order-1', 'OUT_FOR_DELIVERY');
      expect(orderService.getById).toHaveBeenCalledTimes(2);
    });
  });

  it('shows only pickup completion and cancellation after acceptance', async () => {
    (orderService.getById as jest.Mock).mockResolvedValue({
      ...mockOrder,
      status: 'ACCEPTED',
      order_type: 'pickup',
      assigned_driver_id: null,
      assigned_driver_name: null,
      assigned_driver_phone: null,
    });

    const { findByText, queryByText } = render(
      <AdminOrderDetailsScreen
        navigation={{ goBack: jest.fn() } as never}
        route={{ key: 'AdminOrderDetails', name: 'AdminOrderDetails', params: { orderId: 'order-1' } } as never}
      />,
    );

    await findByText('Complete order');
    expect(queryByText('Mark order ready')).toBeNull();
    expect(queryByText('Mark out for delivery')).toBeNull();
    expect(queryByText('Driver Two')).toBeNull();
    expect(await findByText('Cancel order')).toBeTruthy();
  });

  it('locks status controls while an update is running', async () => {
    let resolveUpdate: ((value: { id: string; status: string }) => void) | undefined;
    const pendingUpdate = new Promise<{ id: string; status: string }>((resolve) => {
      resolveUpdate = resolve;
    });
    (orderService.getById as jest.Mock).mockResolvedValue({ ...mockOrder, status: 'READY' });
    (orderService.updateStatus as jest.Mock).mockReturnValue(pendingUpdate);
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.text === 'Confirm')?.onPress?.();
    });

    const { findByTestId } = render(
      <AdminOrderDetailsScreen
        navigation={{ goBack: jest.fn() } as never}
        route={{ key: 'AdminOrderDetails', name: 'AdminOrderDetails', params: { orderId: 'order-1' } } as never}
      />,
    );

    fireEvent.press(await findByTestId('admin-forward-status'));

    await waitFor(async () => {
      expect(await findByTestId('admin-forward-status')).toBeDisabled();
      expect(await findByTestId('admin-cancel-order')).toBeDisabled();
    });

    resolveUpdate?.({ id: 'order-1', status: 'OUT_FOR_DELIVERY' });
    await waitFor(() => expect(orderService.getById).toHaveBeenCalledTimes(2));
  });

  it('keeps the order visible and reports a failed status update', async () => {
    (orderService.getById as jest.Mock).mockResolvedValue({ ...mockOrder, status: 'READY' });
    (orderService.updateStatus as jest.Mock).mockRejectedValue(new Error('Network issue'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((title, _message, buttons) => {
      if (title === 'Confirm order action') {
        buttons?.find((button) => button.text === 'Confirm')?.onPress?.();
      }
    });

    const { findByText } = render(
      <AdminOrderDetailsScreen
        navigation={{ goBack: jest.fn() } as never}
        route={{ key: 'AdminOrderDetails', name: 'AdminOrderDetails', params: { orderId: 'order-1' } } as never}
      />,
    );

    fireEvent.press(await findByText('Mark out for delivery'));

    await waitFor(() => {
      expect(alert).toHaveBeenCalledWith('Error', 'Something went wrong');
      expect(orderService.getById).toHaveBeenCalledTimes(1);
    });
    expect(await findByText('#202')).toBeTruthy();
  });
});
