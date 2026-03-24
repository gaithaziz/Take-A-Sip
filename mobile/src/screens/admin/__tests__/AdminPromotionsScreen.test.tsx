import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { AdminPromotionsScreen } from '@/screens/admin/AdminPromotionsScreen';

const mockListPromotions = jest.fn();
const mockGetMenuTree = jest.fn();
const mockCreatePromotion = jest.fn();
const mockTogglePromotion = jest.fn();

const translationMap: Record<string, string> = {
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.retry': 'Retry',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'validation.requiredFields': 'Required fields',
  'admin.promotionsTitle': 'Promotions',
  'admin.createPromotion': 'Create promotion',
  'admin.editPromotion': 'Edit promotion',
  'admin.offerIdentity': 'Offer identity',
  'admin.offerRules': 'Offer rules',
  'admin.offerWindow': 'Active window',
  'admin.eligibleMenuItems': 'Eligible menu items',
  'admin.eligibilityTrigger': 'Eligibility trigger',
  'admin.offerStatusSection': 'Live status',
  'admin.quickTargetPicks': 'Quick target picks',
  'admin.titleEn': 'Title (English)',
  'admin.titleAr': 'Title (Arabic)',
  'admin.promotionType': 'Promotion type',
  'admin.promoTypeTemporary': 'Temporary',
  'admin.promoTypeFirstTime': 'First-time offer',
  'admin.promoTypeLoyalty': 'Loyalty',
  'admin.promoTypeBuyGet': 'Buy N Get M Free',
  'admin.value': 'Value',
  'admin.buyQuantity': 'Buy quantity',
  'admin.freeQuantity': 'Free quantity',
  'admin.buyGetRule': 'Buy/Get rule',
  'admin.startDate': 'Start date',
  'admin.startTime': 'Start time',
  'admin.endDate': 'End date',
  'admin.endTime': 'End time',
  'admin.timeRange': 'Time range',
  'admin.targetSearch': 'Search menu targets',
  'admin.targetSearchPlaceholder': 'Search sections, items, sizes, or add-ons',
  'admin.wholeMenu': 'Whole menu',
  'admin.allSections': 'All sections',
  'admin.noTargetsSelected': 'No menu targets selected yet.',
  'admin.appliesToWholeMenu': 'Applies to the whole menu',
  'admin.firstTimeEligibilityDetail': 'Available only to users who have not completed any previous orders.',
  'admin.loyaltyEligibilityDetail': 'Available only when the required completed order count is reached.',
  'admin.temporaryEligibilityDetail': 'Available to all users during the active window unless you scope it to specific menu entries.',
  'admin.buyGetEligibilityDetail': 'Available when the cart has enough qualifying items to unlock the free quantity.',
  'admin.requiredCompletedOrders': 'Required completed orders',
  'admin.completedOrdersEligibilityPrefix': 'Available after',
  'admin.optional': 'Optional',
  'admin.ordersThreshold': 'orders',
  'admin.status': 'Status',
  'admin.active': 'Active',
  'admin.inactive': 'Inactive',
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
  'admin.scheduled': 'Scheduled',
  'admin.expired': 'Expired',
  'admin.dateRange': 'Date range',
  'admin.edit': 'Edit',
  'admin.missingTranslation': 'Missing translation',
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

jest.mock('@/services/adminService', () => ({
  adminService: {
    listPromotions: (...args: any[]) => mockListPromotions(...args),
    getMenuTree: (...args: any[]) => mockGetMenuTree(...args),
    createPromotion: (...args: any[]) => mockCreatePromotion(...args),
    updatePromotion: jest.fn(),
    togglePromotion: (...args: any[]) => mockTogglePromotion(...args),
  },
}));

describe('AdminPromotionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    mockListPromotions.mockResolvedValue({
      promotions: [
        {
          id: 'promo-1',
          title_en: 'Latte Loyalty',
          title_ar: 'ولاء اللاتيه',
          type: 'LOYALTY',
          value: '3.00',
          starts_at: '2026-03-23T08:00:00Z',
          ends_at: '2026-03-25T08:00:00Z',
          is_active: true,
          required_completed_orders: 5,
          buy_quantity: null,
          free_quantity: null,
          loyalty_rule_id: null,
          targets: [{ id: 'target-1', promotion_id: 'promo-1', entity_type: 'item', entity_id: 'item-1', entity_name_en: 'Latte', entity_name_ar: 'لاتيه' }],
          scope_summary_en: 'Applies to Latte',
          scope_summary_ar: 'ينطبق على لاتيه',
          eligibility_summary_en: 'Available after 5 completed orders',
          eligibility_summary_ar: 'متاح بعد 5 طلبات مكتملة',
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
              item_types: [{ id: 'type-1', item_id: 'item-1', name_en: 'Hot', name_ar: 'ساخن', image_url: null, sort_order: 1, is_active: true, sizes: [{ id: 'size-1', type_id: 'type-1', name_en: 'Large', name_ar: 'كبير', image_url: null, price: '4.00', sort_order: 1, is_active: true, addons: [] }] }],
            },
          ],
        },
      ],
    });
    mockCreatePromotion.mockResolvedValue({ id: 'created-promo' });
    mockTogglePromotion.mockResolvedValue({ id: 'promo-1', is_active: false });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows offer summaries and confirms before toggling a live offer', async () => {
    const { getByText } = render(<AdminPromotionsScreen />);

    await waitFor(() => {
      expect(getByText('Promotions')).toBeTruthy();
      expect(getByText('Latte Loyalty')).toBeTruthy();
      expect(getByText('Applies to Latte')).toBeTruthy();
      expect(getByText('Available after 5 completed orders')).toBeTruthy();
    });

    fireEvent.press(getByText('Disable'));
    expect(Alert.alert).toHaveBeenCalledWith('Disable', 'This offer is live for customers right now. Are you sure you want to change its status?', expect.any(Array));
  });

  it('creates a buy-get offer with selected targets and completed-order eligibility', async () => {
    const { getAllByText, getByLabelText, getByPlaceholderText, getByText } = render(<AdminPromotionsScreen />);

    await waitFor(() => {
      expect(getByText('Promotions')).toBeTruthy();
    });

    fireEvent.changeText(getByLabelText('Title (English)'), 'VIP Latte');
    fireEvent.changeText(getByLabelText('Title (Arabic)'), 'لاتيه كبار الشخصيات');
    fireEvent.press(getByLabelText('Promotion type: Buy N Get M Free'));
    fireEvent.changeText(getByLabelText('Buy quantity'), '2');
    fireEvent.changeText(getByLabelText('Free quantity'), '1');
    fireEvent.changeText(getByLabelText('Required completed orders'), '4');
    fireEvent.changeText(getByPlaceholderText('Search sections, items, sizes, or add-ons'), 'Latte');
    fireEvent.press(getByLabelText('Coffee > Latte'));
    fireEvent.press(getAllByText('Create promotion').at(-1)!);

    await waitFor(() => {
      expect(mockCreatePromotion).toHaveBeenCalledWith(
        expect.objectContaining({
          title_en: 'VIP Latte',
          title_ar: 'لاتيه كبار الشخصيات',
          type: 'BUY_N_GET_M_FREE',
          value: 0,
          buy_quantity: 2,
          free_quantity: 1,
          required_completed_orders: 4,
          targets: [{ entity_type: 'item', entity_id: 'item-1' }],
        }),
      );
    });
  });

  it('lets the admin target all sections with one tap', async () => {
    const { getAllByText, getByLabelText, getByText } = render(<AdminPromotionsScreen />);

    await waitFor(() => {
      expect(getByText('Promotions')).toBeTruthy();
    });

    fireEvent.changeText(getByLabelText('Title (English)'), 'Section Offer');
    fireEvent.changeText(getByLabelText('Title (Arabic)'), 'عرض الأقسام');
    fireEvent.changeText(getByLabelText('Value'), '2');
    fireEvent.press(getByText('All sections'));
    fireEvent.press(getAllByText('Create promotion').at(-1)!);

    await waitFor(() => {
      expect(mockCreatePromotion).toHaveBeenCalledWith(
        expect.objectContaining({
          title_en: 'Section Offer',
          title_ar: 'عرض الأقسام',
          type: 'TEMPORARY',
          value: 2,
          targets: [{ entity_type: 'section', entity_id: 'section-1' }],
        }),
      );
    });
  });
});
