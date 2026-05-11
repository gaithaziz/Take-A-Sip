import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { AdminPromotionsScreen } from '@/screens/admin/AdminPromotionsScreen';

const mockListPromotions = jest.fn();
const mockGetMenuTree = jest.fn();
const mockCreatePromotion = jest.fn();
const mockUpdatePromotion = jest.fn();
const mockTogglePromotion = jest.fn();

const translationMap: Record<string, string> = {
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.retry': 'Retry',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.add': 'Add',
  'common.remove': 'Remove',
  'validation.requiredFields': 'Required fields',
  'admin.promotionsTitle': 'Promotions',
  'admin.createPromotion': 'Create promotion',
  'admin.editPromotion': 'Edit promotion',
  'admin.offerIdentity': 'Offer identity',
  'admin.offerRules': 'Offer rules',
  'admin.offerBehavior': 'What should this offer do?',
  'admin.offerBehaviorDiscount': 'Take a fixed amount off',
  'admin.offerBehaviorDiscountHelp': 'Fixed discount help',
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
  'admin.buyGetRule': 'Buy/Get rule',
  'admin.discountAmount': 'Discount amount',
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
  'admin.noPromotionsTitle': 'No promotions',
  'admin.noPromotionsSubtitle': 'Create a promotion to show offers in client app.',
  'admin.disable': 'Disable',
  'admin.enable': 'Enable',
  'admin.liveOfferToggleConfirm': 'This offer is live for customers right now. Are you sure you want to change its status?',
  'admin.liveNow': 'Live now',
  'admin.dateRange': 'Date range',
  'admin.edit': 'Edit',
  'admin.missingTranslation': 'Missing translation',
  'admin.titleEn': 'Title (English)',
  'admin.titleAr': 'Title (Arabic)',
  'admin.active': 'Active',
  'admin.inactive': 'Inactive',
  'admin.section': 'Section',
  'admin.item': 'Item',
  'admin.type': 'Type',
  'admin.size': 'Size',
  'admin.addon': 'Add-on',
  'admin.invalidDateRange': 'Invalid date range',
};

const mockTranslate = (key: string) => translationMap[key] ?? key;

jest.mock('@/hooks/useAppTranslation', () => ({
  useAppTranslation: () => ({ language: 'en', isRTL: false, t: mockTranslate }),
}));

jest.mock('@/state/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', isRTL: false, toggleLanguage: jest.fn() }),
}));

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
  DateTimeField: ({ label }: any) => {
    const { Text } = require('react-native');
    return <Text>{label}</Text>;
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
    togglePromotion: (...args: any[]) => mockTogglePromotion(...args),
  },
}));

describe('AdminPromotionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
              description_en: null,
              description_ar: null,
              sort_order: 1,
              is_active: true,
              item_types: [{ id: 'type-1', item_id: 'item-1', name_en: 'Hot', name_ar: 'ساخن', image_url: null, sort_order: 1, is_active: true, sizes: [] }],
            },
            {
              id: 'item-2',
              section_id: 'section-1',
              name_en: 'Muffin',
              name_ar: 'مافن',
              image_url: null,
              description_en: null,
              description_ar: null,
              sort_order: 2,
              is_active: true,
              item_types: [{ id: 'type-2', item_id: 'item-2', name_en: 'Fresh', name_ar: 'طازج', image_url: null, sort_order: 1, is_active: true, sizes: [] }],
            },
          ],
        },
      ],
    });
    mockCreatePromotion.mockResolvedValue({ id: 'created-promo' });
    mockUpdatePromotion.mockResolvedValue({ id: 'promo-1' });
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
      expect(getByText('Buy from Latte; free item from Muffin')).toBeTruthy();
      expect(getByText('Available after 4 completed orders')).toBeTruthy();
    });

    expect(queryByText('All sections')).toBeNull();
    fireEvent.press(getByText('Disable'));
    expect(Alert.alert).toHaveBeenCalledWith('Disable', 'This offer is live for customers right now. Are you sure you want to change its status?', expect.any(Array));
  });

  it('creates a buy-get offer with separate buy and free targets', async () => {
    const { getAllByLabelText, getAllByPlaceholderText, getAllByText, getByLabelText, getByText } = render(<AdminPromotionsScreen />);

    await waitFor(() => {
      expect(getByText('Promotions')).toBeTruthy();
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
    const { getAllByText, getByLabelText, getByText } = render(<AdminPromotionsScreen />);

    await waitFor(() => {
      expect(getByText('Promotions')).toBeTruthy();
    });

    fireEvent.changeText(getByLabelText('Title (English)'), 'Welcome offer');
    fireEvent.changeText(getByLabelText('Title (Arabic)'), 'عرض الترحيب');
    fireEvent.changeText(getByLabelText('Discount amount'), '2');
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
  });

  it('creates a free delivery threshold offer', async () => {
    const { getAllByText, getByLabelText, getByText } = render(<AdminPromotionsScreen />);

    await waitFor(() => {
      expect(getByText('Promotions')).toBeTruthy();
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
    const { getAllByText, getByLabelText, getByText } = render(<AdminPromotionsScreen />);

    await waitFor(() => {
      expect(getByText('Promotions')).toBeTruthy();
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
