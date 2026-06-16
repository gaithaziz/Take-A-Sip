import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { AdminPromotionEditorScreen } from '@/screens/admin/AdminPromotionEditorScreen';
import { AdminPromotionsScreen } from '@/screens/admin/AdminPromotionsScreen';

jest.setTimeout(15000);

const mockListPromotions = jest.fn();
const mockGetMenuTree = jest.fn();
const mockCreatePromotion = jest.fn();
const mockUpdatePromotion = jest.fn();
const mockDeletePromotion = jest.fn();
const mockTogglePromotion = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: Record<string, unknown> | undefined;
let mockDateTimeFieldValues: Record<string, Date> = {};

const translationMap: Record<string, string> = {
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.retry': 'Retry',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.back': 'Back',
  'common.add': 'Add',
  'common.remove': 'Remove',
  'validation.requiredFields': 'Required fields',
  'admin.promotionsTitle': 'Promotions',
  'admin.promotionsBrowseSubtitle': 'See what is live, upcoming, expired, or paused.',
  'admin.addPromotion': 'Add promotion',
  'admin.allPromotions': 'All promotions',
  'admin.upcoming': 'Upcoming',
  'admin.searchPromotions': 'Search promotions',
  'admin.searchPromotionsPlaceholder': 'Search title, scope, or eligibility',
  'admin.previewWholeMenu': 'Preview whole menu',
  'admin.previewReadOnly': 'Read-only customer preview. Ordering is disabled.',
  'admin.createPromotion': 'Create promotion',
  'admin.editPromotion': 'Edit promotion',
  'admin.promotionEditorSubtitle': 'Build the offer, check the customer preview, then publish.',
  'admin.customerOfferPreview': 'Customer offer preview',
  'admin.offerIdentity': 'Offer identity',
  'admin.offerRules': 'Offer rules',
  'admin.offerBehavior': 'What should this offer do?',
  'admin.offerBehaviorDiscount': 'Apply a discount percent',
  'admin.offerBehaviorDiscountHelp': 'Percentage discount help',
  'admin.offerBehaviorFirstTimeFreeItem': 'First order gets one free item',
  'admin.offerBehaviorFirstTimeFreeItemHelp': 'First order free item help',
  'admin.offerBehaviorBuyGet': 'Buy some, get some free',
  'admin.offerBehaviorBuyGetHelp': 'Buy/get help',
  'admin.offerBehaviorFreeDelivery': 'Free delivery above an amount',
  'admin.offerBehaviorFreeDeliveryHelp': 'Free delivery help',
  'admin.freeDeliveryBenefit': 'Free delivery benefit',
  'admin.freeDelivery': 'Free delivery',
  'admin.freeDeliveryModeFree': 'Free delivery',
  'admin.freeDeliveryModeFreeHelp': 'Waive the delivery fee',
  'admin.freeDeliveryModePercent': 'Percentage discount',
  'admin.freeDeliveryModePercentHelp': 'Discount above the threshold',
  'admin.offerWindow': 'Active window',
  'admin.eligibleMenuItems': 'Eligible menu items',
  'admin.eligibilityTrigger': 'Eligibility trigger',
  'admin.eligibilityChoice': 'Who can use this offer?',
  'admin.eligibilityEveryone': 'Everyone',
  'admin.eligibilityEveryoneHelp': 'Any customer can use this offer while it is active.',
  'admin.eligibilityFirstTime': 'New customers only',
  'admin.eligibilityFirstTimeHelp': 'Only customers with no completed orders can use this offer.',
  'admin.eligibilityAfterOrders': 'Returning customers after X orders',
  'admin.eligibilityAfterOrdersHelp': 'Use this when the customer must finish a certain number of completed orders first.',
  'admin.requiredCompletedOrders': 'Required completed orders',
  'admin.requiredCompletedOrdersPlaceholder': 'Example: 5',
  'admin.buyQuantity': 'Buy quantity',
  'admin.freeQuantity': 'Free quantity',
  'admin.singleFreeItemRule': 'One matching item becomes free',
  'admin.buyGetRule': 'Buy/Get rule',
  'admin.discountAmount': 'Discount percent',
  'admin.minimumOrderAmount': 'Minimum order amount',
  'admin.percentageDiscount': 'Percentage discount',
  'admin.startDate': 'Start date',
  'admin.startTime': 'Start time',
  'admin.endDate': 'End date',
  'admin.endTime': 'End time',
  'admin.timeRange': 'Time range',
  'admin.targetSearch': 'Search menu targets',
  'admin.targetSearchPlaceholder': 'Search sections, items, sizes, or add-ons',
  'admin.targetType': 'Target type',
  'admin.targetNoLongerAvailable': 'One or more selected menu targets no longer exist. Refresh the menu targets and choose them again.',
  'admin.deletedMenuTarget': 'Unavailable menu target',
  'admin.matchingTargets': 'Matching targets',
  'admin.noMatchingTargets': 'No matching targets found. Try another search or target type.',
  'admin.specificTargets': 'Specific targets',
  'admin.scopeWholeMenuHelp': 'Whole menu help',
  'admin.scopeSpecificTargetsHelp': 'Specific targets help',
  'admin.scopeChooserHelp': 'Choose menu scope',
  'admin.wholeMenu': 'Whole menu',
  'admin.buyFrom': 'Customer buys from',
  'admin.buyFromHelp': 'Choose what counts toward the buy quantity.',
  'admin.freeFrom': 'Customer gets free from',
  'admin.freeFromHelp': 'Choose what can become free.',
  'admin.selectedTargets': 'Selected targets',
  'admin.noTargetsSelected': 'No menu targets selected yet.',
  'admin.appliesToWholeMenu': 'Applies to the whole menu',
  'admin.completedOrdersEligibilityPrefix': 'Available after',
  'admin.ordersThreshold': 'orders',
  'admin.offerStatusSection': 'Live status',
  'admin.offerSummary': 'Offer summary',
  'admin.scopeSummary': 'Scope',
  'admin.eligibilitySummary': 'Eligibility',
  'admin.saveChanges': 'Save changes',
  'admin.deletePromotion': 'Delete offer',
  'admin.deletePromotionConfirm': 'Delete this offer permanently? Customers will no longer see or use it.',
  'admin.noPromotionsTitle': 'No promotions',
  'admin.noPromotionsSubtitle': 'Create a promotion to show offers in client app.',
  'admin.disable': 'Disable',
  'admin.enable': 'Enable',
  'admin.liveOfferToggleConfirm': 'This offer is live for customers right now. Are you sure you want to change its status?',
  'admin.liveNow': 'Live now',
  'admin.expired': 'Expired',
  'admin.dateRange': 'Date range',
  'admin.edit': 'Edit',
  'admin.missingTranslation': 'Missing translation',
  'admin.titleEn': 'Title (English)',
  'admin.titleAr': 'Title (Arabic)',
  'admin.active': 'Active',
  'admin.inactive': 'Inactive',
  'admin.section': 'Section',
  'admin.subgroup': 'Subgroup',
  'admin.item': 'Item',
  'admin.type': 'Type',
  'admin.size': 'Size',
  'admin.addon': 'Add-on',
  'admin.invalidDateRange': 'Invalid date range',
  'admin.invalidRequiredOrders': 'Required orders must be at least 1.',
  'home.offers': 'Offers',
};

const mockTranslate = (key: string) => translationMap[key] ?? key;

jest.mock('@/hooks/useAppTranslation', () => ({
  useAppTranslation: () => ({ language: 'en', isRTL: false, t: mockTranslate }),
}));

jest.mock('@/state/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', isRTL: false, toggleLanguage: jest.fn() }),
}));

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack, canGoBack: () => true }),
    useRoute: () => ({ params: mockRouteParams }),
    useFocusEffect: (callback: () => void | (() => void)) => React.useEffect(() => callback(), [callback]),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/components/AppInput', () => ({
  AppInput: ({ label, value, onChangeText, placeholder }: any) => {
    const { TextInput } = require('react-native');
    return <TextInput accessibilityLabel={label ?? placeholder} placeholder={placeholder} value={value} onChangeText={onChangeText} />;
  },
}));

jest.mock('@/components/DateTimeField', () => ({
  DateTimeField: ({ label, value, onChange }: any) => {
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => mockDateTimeFieldValues[label] && onChange(mockDateTimeFieldValues[label])}>
        <Text>{`${label}:${value?.toISOString?.() ?? ''}`}</Text>
      </Pressable>
    );
  },
}));

jest.mock('@/components/admin/SelectDropdownField', () => ({
  SelectDropdownField: ({ label, options, onChange }: any) => {
    const { Pressable, Text, View } = require('react-native');
    return (
      <View>
        <Text>{label}</Text>
        {options.map((option: any) => (
          <Pressable key={`${label}-${option.value}`} onPress={() => onChange(option.value)} accessibilityLabel={`${label}: ${option.label}`}>
            <Text>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  },
}));

jest.mock('@/services/adminService', () => ({
  adminService: {
    listPromotions: (...args: any[]) => mockListPromotions(...args),
    getMenuTree: (...args: any[]) => mockGetMenuTree(...args),
    createPromotion: (...args: any[]) => mockCreatePromotion(...args),
    updatePromotion: (...args: any[]) => mockUpdatePromotion(...args),
    deletePromotion: (...args: any[]) => mockDeletePromotion(...args),
    togglePromotion: (...args: any[]) => mockTogglePromotion(...args),
  },
}));

describe('AdminPromotionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = undefined;
    mockDateTimeFieldValues = {};
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    const now = Date.now();
    mockListPromotions.mockResolvedValue({
      promotions: [
        {
          id: 'promo-1',
          title_en: 'Latte + Muffin',
          title_ar: 'لاتيه + مافن',
          type: 'BUY_N_GET_M_FREE',
          value: '0.00',
          starts_at: new Date(now - 60 * 60 * 1000).toISOString(),
          ends_at: new Date(now + 60 * 60 * 1000).toISOString(),
          is_active: true,
          required_completed_orders: 4,
          buy_quantity: 2,
          free_quantity: 1,
          loyalty_rule_id: null,
          targets: [],
          buy_targets: [{ id: 'target-buy', promotion_id: 'promo-1', target_group: 'buy', entity_type: 'item', entity_id: 'item-1', entity_name_en: 'Latte', entity_name_ar: 'لاتيه' }],
          free_targets: [{ id: 'target-free', promotion_id: 'promo-1', target_group: 'free', entity_type: 'item', entity_id: 'item-2', entity_name_en: 'Muffin', entity_name_ar: 'مافن' }],
          scope_summary_en: 'Buy from Latte; free item from Muffin',
          scope_summary_ar: 'اشتر من لاتيه وخذ من مافن',
          eligibility_summary_en: 'Available after 4 completed orders',
          eligibility_summary_ar: 'متاح بعد 4 طلبات مكتملة',
        },
      ],
    });
    mockGetMenuTree.mockResolvedValue({
      sections: [
        {
          id: 'section-1',
          name_en: 'Coffee',
          name_ar: 'قهوة',
          image_url: null,
          is_active: true,
          sort_order: 1,
          items: [
            {
              id: 'item-1',
              section_id: 'section-1',
              name_en: 'Latte',
              name_ar: 'لاتيه',
              image_url: null,
              description_en: 'Hot drinks',
              description_ar: 'مشروبات ساخنة',
              sort_order: 1,
              is_active: true,
              item_types: [
                {
                  id: 'type-1',
                  item_id: 'item-1',
                  name_en: 'Hot',
                  name_ar: 'ساخن',
                  image_url: null,
                  sort_order: 1,
                  is_active: true,
                  sizes: [
                    {
                      id: 'size-1',
                      type_id: 'type-1',
                      name_en: 'Large',
                      name_ar: 'كبير',
                      image_url: null,
                      price: '4.00',
                      order_limit: null,
                      sort_order: 1,
                      is_active: true,
                      addons: [
                        {
                          id: 'addon-1',
                          size_id: 'size-1',
                          name_en: 'Shot',
                          name_ar: 'شوت',
                          image_url: null,
                          price: '1.00',
                          sort_order: 1,
                          is_active: true,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              id: 'item-2',
              section_id: 'section-1',
              name_en: 'Muffin',
              name_ar: 'مافن',
              image_url: null,
              description_en: 'Hot drinks',
              description_ar: 'مشروبات ساخنة',
              sort_order: 2,
              is_active: true,
              item_types: [
                {
                  id: 'type-2',
                  item_id: 'item-2',
                  name_en: 'Fresh',
                  name_ar: 'طازج',
                  image_url: null,
                  sort_order: 1,
                  is_active: true,
                  sizes: [
                    {
                      id: 'size-2',
                      type_id: 'type-2',
                      name_en: 'One size',
                      name_ar: 'حجم واحد',
                      image_url: null,
                      price: '2.50',
                      order_limit: null,
                      sort_order: 1,
                      is_active: true,
                      addons: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    mockCreatePromotion.mockResolvedValue({ id: 'created-promo' });
    mockUpdatePromotion.mockResolvedValue({ id: 'promo-1' });
    mockDeletePromotion.mockResolvedValue(undefined);
    mockTogglePromotion.mockResolvedValue({ id: 'promo-1', is_active: false });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the saved summary, confirms before toggling, and no longer shows all sections', async () => {
    const { getByText, queryByText } = render(<AdminPromotionsScreen />);

    await waitFor(() => {
      expect(getByText('Promotions')).toBeTruthy();
      expect(getByText('Latte + Muffin')).toBeTruthy();
      expect(getByText(/Buy from Latte; free item from Muffin/)).toBeTruthy();
      expect(getByText(/Available after 4 completed orders/)).toBeTruthy();
    });

    expect(queryByText('All sections')).toBeNull();
    fireEvent.press(getByText('Disable'));
    expect(Alert.alert).toHaveBeenCalledWith('Disable', 'This offer is live for customers right now. Are you sure you want to change its status?', expect.any(Array));
  });

  it('sends edited offer window dates in the update payload', async () => {
    const originalStart = new Date('2026-03-09T08:00:00.000Z');
    const originalEnd = new Date('2026-03-12T20:00:00.000Z');
    const editedStart = new Date('2026-03-10T08:00:00.000Z');
    const editedEnd = new Date('2026-03-14T20:00:00.000Z');
    mockRouteParams = {
      promotion: {
        id: 'promo-1',
        title_en: 'Latte + Muffin',
        title_ar: 'لاتيه + مافن',
        type: 'BUY_N_GET_M_FREE',
        value: '0.00',
        starts_at: originalStart.toISOString(),
        ends_at: originalEnd.toISOString(),
        is_active: true,
        required_completed_orders: 4,
        buy_quantity: 2,
        free_quantity: 1,
        loyalty_rule_id: null,
        targets: [],
        buy_targets: [{ id: 'target-buy', promotion_id: 'promo-1', target_group: 'buy', entity_type: 'item', entity_id: 'item-1', entity_name_en: 'Latte', entity_name_ar: 'لاتيه' }],
        free_targets: [{ id: 'target-free', promotion_id: 'promo-1', target_group: 'free', entity_type: 'item', entity_id: 'item-2', entity_name_en: 'Muffin', entity_name_ar: 'مافن' }],
        scope_summary_en: 'Buy from Latte; free item from Muffin',
        scope_summary_ar: 'اشتر من لاتيه وخذ من مافن',
        eligibility_summary_en: 'Available after 4 completed orders',
        eligibility_summary_ar: 'متاح بعد 4 طلبات مكتملة',
      },
    };
    mockDateTimeFieldValues = {
      'Start date': editedStart,
      'End date': editedEnd,
    };

    const { getAllByText, getByLabelText } = render(<AdminPromotionEditorScreen />);

    await waitFor(() => {
      expect(getAllByText('Edit promotion').length).toBeGreaterThan(0);
    });

    fireEvent.press(getByLabelText('Start date'));
    fireEvent.press(getByLabelText('End date'));
    fireEvent.press(getAllByText('Save changes').at(-1)!);

    await waitFor(() => {
      expect(mockUpdatePromotion).toHaveBeenCalledWith(
        'promo-1',
        expect.objectContaining({
          starts_at: editedStart.toISOString(),
          ends_at: editedEnd.toISOString(),
        }),
      );
    });
    expect(mockUpdatePromotion).not.toHaveBeenCalledWith(
      'promo-1',
      expect.objectContaining({
        starts_at: originalStart.toISOString(),
        ends_at: originalEnd.toISOString(),
      }),
    );
  });

  it('updates old offers with stale unchanged targets without resending target arrays', async () => {
    const originalStart = new Date('2026-03-09T08:00:00.000Z');
    const originalEnd = new Date('2026-03-12T20:00:00.000Z');
    const editedStart = new Date('2026-03-10T08:00:00.000Z');
    mockRouteParams = {
      promotion: {
        id: 'promo-old',
        title_en: 'Snacks 10% off',
        title_ar: 'خصم 10% على السناكات',
        type: 'TEMPORARY',
        value: '10.00',
        starts_at: originalStart.toISOString(),
        ends_at: originalEnd.toISOString(),
        is_active: true,
        required_completed_orders: null,
        buy_quantity: null,
        free_quantity: null,
        loyalty_rule_id: null,
        targets: [
          {
            id: 'target-stale',
            promotion_id: 'promo-old',
            target_group: 'scope',
            entity_type: 'section',
            entity_id: 'deleted-section',
            entity_name_en: null,
            entity_name_ar: null,
          },
        ],
        buy_targets: [],
        free_targets: [],
        scope_summary_en: 'Unavailable menu target',
        scope_summary_ar: 'هدف غير متاح',
        eligibility_summary_en: 'Available to everyone',
        eligibility_summary_ar: 'متاح للجميع',
      },
    };
    mockDateTimeFieldValues = {
      'Start date': editedStart,
    };

    const { getAllByText, getByLabelText } = render(<AdminPromotionEditorScreen />);

    await waitFor(() => {
      expect(getAllByText('Edit promotion').length).toBeGreaterThan(0);
    });

    fireEvent.press(getByLabelText('Start date'));
    fireEvent.press(getAllByText('Save changes').at(-1)!);

    await waitFor(() => {
      expect(mockUpdatePromotion).toHaveBeenCalledWith(
        'promo-old',
        expect.objectContaining({
          starts_at: editedStart.toISOString(),
        }),
      );
    });
    const payload = mockUpdatePromotion.mock.calls[0][1];
    expect(payload).not.toHaveProperty('targets');
    expect(payload).not.toHaveProperty('buy_targets');
    expect(payload).not.toHaveProperty('free_targets');
  });

  it('confirms and deletes an existing offer', async () => {
    mockRouteParams = {
      promotion: {
        id: 'promo-delete',
        title_en: 'Delete me',
        title_ar: 'احذفني',
        type: 'TEMPORARY',
        value: '5.00',
        starts_at: new Date('2026-03-09T08:00:00.000Z').toISOString(),
        ends_at: new Date('2026-03-12T20:00:00.000Z').toISOString(),
        is_active: false,
        required_completed_orders: null,
        buy_quantity: null,
        free_quantity: null,
        loyalty_rule_id: null,
        targets: [],
        buy_targets: [],
        free_targets: [],
        scope_summary_en: 'Whole menu',
        scope_summary_ar: 'كل القائمة',
        eligibility_summary_en: 'Available to everyone',
        eligibility_summary_ar: 'متاح للجميع',
      },
    };

    const { getAllByText } = render(<AdminPromotionEditorScreen />);

    await waitFor(() => {
      expect(getAllByText('Edit promotion').length).toBeGreaterThan(0);
    });

    fireEvent.press(getAllByText('Delete offer').at(-1)!);
    expect(Alert.alert).toHaveBeenCalledWith('Delete offer', 'Delete this offer permanently? Customers will no longer see or use it.', expect.any(Array));

    const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)![2] as Array<{ onPress?: () => void; style?: string; text: string }>;
    expect(buttons[1]).toEqual(expect.objectContaining({ text: 'Delete offer', style: 'destructive' }));
    buttons[1].onPress?.();

    await waitFor(() => {
      expect(mockDeletePromotion).toHaveBeenCalledWith('promo-delete');
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('reapplies route data when the same offer returns with updated dates', async () => {
    const originalStart = new Date('2026-03-09T08:00:00.000Z');
    const originalEnd = new Date('2026-03-12T20:00:00.000Z');
    const refreshedStart = new Date('2026-03-11T08:00:00.000Z');
    const refreshedEnd = new Date('2026-03-15T20:00:00.000Z');
    const promotion = {
      id: 'promo-1',
      title_en: 'Latte + Muffin',
      title_ar: 'لاتيه + مافن',
      type: 'BUY_N_GET_M_FREE',
      value: '0.00',
      starts_at: originalStart.toISOString(),
      ends_at: originalEnd.toISOString(),
      is_active: true,
      required_completed_orders: 4,
      buy_quantity: 2,
      free_quantity: 1,
      loyalty_rule_id: null,
      targets: [],
      buy_targets: [{ id: 'target-buy', promotion_id: 'promo-1', target_group: 'buy', entity_type: 'item', entity_id: 'item-1', entity_name_en: 'Latte', entity_name_ar: 'لاتيه' }],
      free_targets: [{ id: 'target-free', promotion_id: 'promo-1', target_group: 'free', entity_type: 'item', entity_id: 'item-2', entity_name_en: 'Muffin', entity_name_ar: 'مافن' }],
      scope_summary_en: 'Buy from Latte; free item from Muffin',
      scope_summary_ar: 'اشتر من لاتيه وخذ من مافن',
      eligibility_summary_en: 'Available after 4 completed orders',
      eligibility_summary_ar: 'متاح بعد 4 طلبات مكتملة',
    };
    mockRouteParams = { promotion };

    const { getByText, rerender } = render(<AdminPromotionEditorScreen />);

    await waitFor(() => {
      expect(getByText(`Start date:${originalStart.toISOString()}`)).toBeTruthy();
      expect(getByText(`End date:${originalEnd.toISOString()}`)).toBeTruthy();
    });

    mockRouteParams = {
      promotion: {
        ...promotion,
        starts_at: refreshedStart.toISOString(),
        ends_at: refreshedEnd.toISOString(),
      },
    };
    rerender(<AdminPromotionEditorScreen />);

    await waitFor(() => {
      expect(getByText(`Start date:${refreshedStart.toISOString()}`)).toBeTruthy();
      expect(getByText(`End date:${refreshedEnd.toISOString()}`)).toBeTruthy();
    });
  });

  it('creates a buy-get offer with separate buy and free targets', async () => {
    const { getAllByLabelText, getAllByPlaceholderText, getAllByText, getByLabelText, getByText } = render(<AdminPromotionEditorScreen />);

    await waitFor(() => {
      expect(getByText('Offer identity')).toBeTruthy();
    });

    fireEvent.changeText(getByLabelText('Title (English)'), 'Buy latte get muffin');
    fireEvent.changeText(getByLabelText('Title (Arabic)'), 'اشتر لاتيه وخذ مافن');
    fireEvent.press(getByLabelText('What should this offer do?: Buy some, get some free'));
    fireEvent.changeText(getByLabelText('Buy quantity'), '2');
    fireEvent.changeText(getByLabelText('Free quantity'), '1');
    fireEvent.press(getByLabelText('Who can use this offer?: Returning customers after X orders'));
    fireEvent.changeText(getByLabelText('Required completed orders'), '4');

    fireEvent.press(getByLabelText('Customer buys from: Specific targets'));
    fireEvent.press(getByLabelText('Target type: Item'));
    fireEvent.changeText(getAllByPlaceholderText('Search sections, items, sizes, or add-ons')[0], 'Latte');
    fireEvent.press(getByLabelText('Coffee > Latte'));

    fireEvent.press(getByLabelText('Customer gets free from: Specific targets'));
    fireEvent.press(getAllByLabelText('Target type: Item')[1]);
    fireEvent.changeText(getAllByPlaceholderText('Search sections, items, sizes, or add-ons')[1], 'Muffin');
    fireEvent.press(getByLabelText('Coffee > Muffin'));

    fireEvent.press(getAllByText('Create promotion').at(-1)!);

    await waitFor(() => {
      expect(mockCreatePromotion).toHaveBeenCalledWith(
        expect.objectContaining({
          title_en: 'Buy latte get muffin',
          title_ar: 'اشتر لاتيه وخذ مافن',
          type: 'BUY_N_GET_M_FREE',
          value: 0,
          required_completed_orders: 4,
          buy_quantity: 2,
          free_quantity: 1,
          targets: [],
          buy_targets: [{ entity_type: 'item', entity_id: 'item-1' }],
          free_targets: [{ entity_type: 'item', entity_id: 'item-2' }],
        }),
      );
    });
  });

  it('creates a fixed discount for new customers on the whole menu', async () => {
    const { getAllByText, getByLabelText, getByText } = render(<AdminPromotionEditorScreen />);

    await waitFor(() => {
      expect(getByText('Offer identity')).toBeTruthy();
    });

    fireEvent.changeText(getByLabelText('Title (English)'), 'Welcome offer');
    fireEvent.changeText(getByLabelText('Title (Arabic)'), 'عرض الترحيب');
    fireEvent.changeText(getByLabelText('Discount percent'), '2');
    fireEvent.press(getByLabelText('Who can use this offer?: New customers only'));
    fireEvent.press(getAllByText('Create promotion').at(-1)!);

    await waitFor(() => {
      expect(mockCreatePromotion).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'FIRST_TIME',
          value: 2,
          targets: [],
          buy_targets: [],
          free_targets: [],
        }),
      );
    });
    expect(mockGetMenuTree).not.toHaveBeenCalledWith({ force: true });
  });

  it('creates a first-time single free item offer from selected hierarchy targets', async () => {
    const { getAllByText, getByLabelText, getByText } = render(<AdminPromotionEditorScreen />);

    await waitFor(() => {
      expect(getByText('Offer identity')).toBeTruthy();
    });

    fireEvent.changeText(getByLabelText('Title (English)'), 'First waffle free');
    fireEvent.changeText(getByLabelText('Title (Arabic)'), 'أول وافل مجاني');
    fireEvent.press(getByLabelText('What should this offer do?: First order gets one free item'));
    fireEvent.press(getByLabelText('Eligible menu items: Specific targets'));
    fireEvent.press(getByLabelText('Target type: Section'));
    fireEvent.press(getByLabelText('Coffee'));
    fireEvent.press(getAllByText('Create promotion').at(-1)!);

    await waitFor(() => {
      expect(mockCreatePromotion).toHaveBeenCalledWith(
        expect.objectContaining({
          title_en: 'First waffle free',
          title_ar: 'أول وافل مجاني',
          type: 'FIRST_TIME_FREE_ITEM',
          value: 0,
          required_completed_orders: null,
          buy_quantity: null,
          free_quantity: null,
          targets: [
            { entity_type: 'item', entity_id: 'item-1' },
            { entity_type: 'item', entity_id: 'item-2' },
          ],
          buy_targets: [],
          free_targets: [],
        }),
      );
    });
  });

  it('does not create a fixed discount above 100 percent', async () => {
    const { getAllByText, getByLabelText, getByText } = render(<AdminPromotionEditorScreen />);

    await waitFor(() => {
      expect(getByText('Offer identity')).toBeTruthy();
    });

    fireEvent.changeText(getByLabelText('Title (English)'), 'Too much discount');
    fireEvent.changeText(getByLabelText('Title (Arabic)'), 'خصم كبير جدا');
    fireEvent.changeText(getByLabelText('Discount percent'), '120');
    fireEvent.press(getAllByText('Create promotion').at(-1)!);

    await waitFor(() => {
      expect(mockCreatePromotion).not.toHaveBeenCalled();
    });
  });

  it('expands a whole section target into item targets before creating a discount', async () => {
    const { getAllByText, getByLabelText, getByText } = render(<AdminPromotionEditorScreen />);

    await waitFor(() => {
      expect(getByText('Offer identity')).toBeTruthy();
    });

    fireEvent.changeText(getByLabelText('Title (English)'), 'Coffee section discount');
    fireEvent.changeText(getByLabelText('Title (Arabic)'), 'خصم قسم القهوة');
    fireEvent.changeText(getByLabelText('Discount percent'), '15');
    fireEvent.press(getByLabelText('Eligible menu items: Specific targets'));
    fireEvent.press(getByLabelText('Target type: Section'));
    fireEvent.press(getByLabelText('Coffee'));
    fireEvent.press(getAllByText('Create promotion').at(-1)!);

    await waitFor(() => {
      expect(mockCreatePromotion).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TEMPORARY',
          value: 15,
          targets: [
            { entity_type: 'item', entity_id: 'item-1' },
            { entity_type: 'item', entity_id: 'item-2' },
          ],
          buy_targets: [],
          free_targets: [],
        }),
      );
    });
  });

  it('creates a concrete size-targeted discount when the size exists in the refreshed menu', async () => {
    const { getAllByText, getByLabelText, getByText } = render(<AdminPromotionEditorScreen />);

    await waitFor(() => {
      expect(getByText('Offer identity')).toBeTruthy();
    });

    fireEvent.changeText(getByLabelText('Title (English)'), 'Large latte discount');
    fireEvent.changeText(getByLabelText('Title (Arabic)'), 'خصم اللاتيه الكبير');
    fireEvent.changeText(getByLabelText('Discount percent'), '12');
    fireEvent.press(getByLabelText('Eligible menu items: Specific targets'));
    fireEvent.press(getByLabelText('Target type: Size'));
    fireEvent.press(getByLabelText('Coffee > Latte > Hot > Large'));
    fireEvent.press(getAllByText('Create promotion').at(-1)!);

    await waitFor(() => {
      expect(mockGetMenuTree).toHaveBeenCalledWith({ force: true });
      expect(mockCreatePromotion).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TEMPORARY',
          value: 12,
          targets: [{ entity_type: 'size', entity_id: 'size-1' }],
        }),
      );
    });
  });

  it('blocks a stale size target after refreshing the menu before save', async () => {
    mockGetMenuTree
      .mockResolvedValueOnce({
        sections: [
          {
            id: 'section-1',
            name_en: 'Coffee',
            name_ar: 'قهوة',
            image_url: null,
            is_active: true,
            sort_order: 1,
            items: [
              {
                id: 'item-1',
                section_id: 'section-1',
                name_en: 'Latte',
                name_ar: 'لاتيه',
                image_url: null,
                description_en: 'Hot drinks',
                description_ar: 'مشروبات ساخنة',
                sort_order: 1,
                is_active: true,
                item_types: [
                  {
                    id: 'type-1',
                    item_id: 'item-1',
                    name_en: 'Hot',
                    name_ar: 'ساخن',
                    image_url: null,
                    sort_order: 1,
                    is_active: true,
                    sizes: [
                      {
                        id: 'stale-size',
                        type_id: 'type-1',
                        name_en: 'Large',
                        name_ar: 'كبير',
                        image_url: null,
                        price: '4.00',
                        order_limit: null,
                        sort_order: 1,
                        is_active: true,
                        addons: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({
        sections: [
          {
            id: 'section-1',
            name_en: 'Coffee',
            name_ar: 'قهوة',
            image_url: null,
            is_active: true,
            sort_order: 1,
            items: [
              {
                id: 'item-1',
                section_id: 'section-1',
                name_en: 'Latte',
                name_ar: 'لاتيه',
                image_url: null,
                description_en: 'Hot drinks',
                description_ar: 'مشروبات ساخنة',
                sort_order: 1,
                is_active: true,
                item_types: [{ id: 'type-1', item_id: 'item-1', name_en: 'Hot', name_ar: 'ساخن', image_url: null, sort_order: 1, is_active: true, sizes: [] }],
              },
            ],
          },
        ],
      });
    const { getAllByText, getByLabelText, getByText } = render(<AdminPromotionEditorScreen />);

    await waitFor(() => {
      expect(getByText('Offer identity')).toBeTruthy();
    });

    fireEvent.changeText(getByLabelText('Title (English)'), 'Stale size discount');
    fireEvent.changeText(getByLabelText('Title (Arabic)'), 'خصم حجم قديم');
    fireEvent.changeText(getByLabelText('Discount percent'), '12');
    fireEvent.press(getByLabelText('Eligible menu items: Specific targets'));
    fireEvent.press(getByLabelText('Target type: Size'));
    fireEvent.press(getByLabelText('Coffee > Latte > Hot > Large'));
    fireEvent.press(getAllByText('Create promotion').at(-1)!);

    await waitFor(() => {
      expect(mockGetMenuTree).toHaveBeenCalledWith({ force: true });
      expect(mockCreatePromotion).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'One or more selected menu targets no longer exist. Refresh the menu targets and choose them again.',
      );
    });
  });

  it('does not submit a raw section target when a selected section has no products loaded', async () => {
    mockGetMenuTree.mockResolvedValueOnce({
      sections: [
        {
          id: 'section-empty',
          name_en: 'Empty Section',
          name_ar: 'قسم فارغ',
          image_url: null,
          is_active: true,
          sort_order: 1,
          items: [],
        },
      ],
    });
    const { getAllByText, getByLabelText, getByText } = render(<AdminPromotionEditorScreen />);

    await waitFor(() => {
      expect(getByText('Offer identity')).toBeTruthy();
    });

    fireEvent.changeText(getByLabelText('Title (English)'), 'Empty section discount');
    fireEvent.changeText(getByLabelText('Title (Arabic)'), 'خصم قسم فارغ');
    fireEvent.changeText(getByLabelText('Discount percent'), '15');
    fireEvent.press(getByLabelText('Eligible menu items: Specific targets'));
    fireEvent.press(getByLabelText('Target type: Section'));
    fireEvent.press(getByLabelText('Empty Section'));
    fireEvent.press(getAllByText('Create promotion').at(-1)!);

    await waitFor(() => {
      expect(mockCreatePromotion).not.toHaveBeenCalled();
      expect(getByText('Required fields')).toBeTruthy();
    });
  });

  it('expands a subgroup target into item targets before creating a discount', async () => {
    const { getAllByText, getByLabelText, getByText } = render(<AdminPromotionEditorScreen />);

    await waitFor(() => {
      expect(getByText('Offer identity')).toBeTruthy();
    });

    fireEvent.changeText(getByLabelText('Title (English)'), 'Hot drinks discount');
    fireEvent.changeText(getByLabelText('Title (Arabic)'), 'خصم المشروبات الساخنة');
    fireEvent.changeText(getByLabelText('Discount percent'), '10');
    fireEvent.press(getByLabelText('Eligible menu items: Specific targets'));
    fireEvent.press(getByLabelText('Target type: Subgroup'));
    fireEvent.press(getByLabelText('Coffee > Hot drinks'));
    fireEvent.press(getAllByText('Create promotion').at(-1)!);

    await waitFor(() => {
      expect(mockCreatePromotion).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'TEMPORARY',
          value: 10,
          targets: [
            { entity_type: 'item', entity_id: 'item-1' },
            { entity_type: 'item', entity_id: 'item-2' },
          ],
        }),
      );
    });
  });

  it('creates a free delivery threshold offer', async () => {
    const { getAllByText, getByLabelText, getByText } = render(<AdminPromotionEditorScreen />);

    await waitFor(() => {
      expect(getByText('Offer identity')).toBeTruthy();
    });

    fireEvent.changeText(getByLabelText('Title (English)'), 'Free delivery over 20');
    fireEvent.changeText(getByLabelText('Title (Arabic)'), 'توصيل مجاني فوق 20');
    fireEvent.press(getByLabelText('What should this offer do?: Free delivery above an amount'));
    fireEvent.changeText(getByLabelText('Minimum order amount'), '20');
    fireEvent.press(getAllByText('Create promotion').at(-1)!);

    await waitFor(() => {
      expect(mockCreatePromotion).toHaveBeenCalledWith(
        expect.objectContaining({
          title_en: 'Free delivery over 20',
          title_ar: 'توصيل مجاني فوق 20',
          type: 'FREE_DELIVERY_ABOVE_AMOUNT',
          value: 20,
          required_completed_orders: null,
          free_delivery_mode: 'FREE_DELIVERY',
          free_delivery_discount_percent: null,
          targets: [],
          buy_targets: [],
          free_targets: [],
        }),
      );
    });
  });

  it('creates a percentage discount offer above a minimum order amount', async () => {
    const { getAllByText, getByLabelText, getByText } = render(<AdminPromotionEditorScreen />);

    await waitFor(() => {
      expect(getByText('Offer identity')).toBeTruthy();
    });

    fireEvent.changeText(getByLabelText('Title (English)'), '20% off over 20');
    fireEvent.changeText(getByLabelText('Title (Arabic)'), 'خصم 20٪ فوق 20');
    fireEvent.press(getByLabelText('What should this offer do?: Free delivery above an amount'));
    fireEvent.changeText(getByLabelText('Minimum order amount'), '20');
    fireEvent.press(getByLabelText('Free delivery benefit: Percentage discount'));
    fireEvent.changeText(getByLabelText('Percentage discount'), '20');
    fireEvent.press(getAllByText('Create promotion').at(-1)!);

    await waitFor(() => {
      expect(mockCreatePromotion).toHaveBeenCalledWith(
        expect.objectContaining({
          title_en: '20% off over 20',
          title_ar: 'خصم 20٪ فوق 20',
          type: 'FREE_DELIVERY_ABOVE_AMOUNT',
          value: 20,
          required_completed_orders: null,
          free_delivery_mode: 'PERCENTAGE_DISCOUNT',
          free_delivery_discount_percent: 20,
          targets: [],
          buy_targets: [],
          free_targets: [],
        }),
      );
    });
  });
});
