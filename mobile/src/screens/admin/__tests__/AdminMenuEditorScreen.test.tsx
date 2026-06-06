import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { AdminMenuCustomerPreviewScreen } from '@/screens/admin/AdminMenuCustomerPreviewScreen';
import { AdminMenuEditorScreen } from '@/screens/admin/AdminMenuEditorScreen';
import { AdminMenuProductEditorScreen } from '@/screens/admin/AdminMenuProductEditorScreen';
import { adminService } from '@/services/adminService';
import { Item } from '@/types/api';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetMenuTree = jest.fn();
const mockListSchedules = jest.fn();

const translationMap: Record<string, string> = {
  'common.appName': 'Take A Sip',
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.retry': 'Retry',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.back': 'Back',
  'common.next': 'Next',
  'common.goBack': 'Go back',
  'admin.menuEditorTitle': 'Menu Editor',
  'admin.menuEditorSubtitle': 'Manage what customers see.',
  'admin.searchMenu': 'Search menu',
  'admin.searchMenuPlaceholder': 'Search the menu hierarchy',
  'admin.filterAll': 'All',
  'admin.active': 'Active',
  'admin.inactive': 'Inactive',
  'admin.filterIssues': 'Needs review',
  'admin.addProduct': 'Add product',
  'admin.addCategory': 'Add category',
  'admin.addProductHere': 'Add product here',
  'admin.allSubgroups': 'All subgroups',
  'admin.ungroupedProducts': 'Ungrouped products',
  'admin.subgroup': 'Subgroup',
  'admin.subgroupEn': 'Subgroup (English)',
  'admin.subgroupAr': 'Subgroup (Arabic)',
  'admin.subgroupsInCategory': 'Subgroups in this category',
  'admin.subgroupHelp': 'Subgroups are headers.',
  'admin.noSubgroupsInCategory': 'No subgroups in this category yet.',
  'admin.noSubgroupSelected': 'No subgroup',
  'admin.createNewSubgroup': 'Create new subgroup',
  'admin.menuLevels': 'Menu levels',
  'admin.newProduct': 'New product',
  'admin.optionGroup': 'Option group',
  'admin.optionGroupHelp': 'Option group help',
  'admin.variantLevelHelp': 'Variant level help',
  'admin.addonLevelHelp': 'Add-on level help',
  'admin.editCategory': 'Edit category',
  'admin.editProduct': 'Edit product',
  'admin.previewAsCustomer': 'Preview as customer',
  'admin.customerPreviewTitle': 'Customer preview',
  'admin.customerPreviewHelp': 'Read-only preview',
  'admin.productPreview': 'Customer preview',
  'admin.disabledPreviewAction': 'Preview only',
  'admin.moreActions': 'More actions',
  'admin.scheduled': 'Scheduled',
  'admin.visibilityVisible': 'Visible',
  'admin.visibilityHiddenInactiveAncestor': 'Hidden: inactive category',
  'admin.visibilityHiddenInactive': 'Hidden: inactive',
  'admin.visibilityNeedsTypeAndSize': 'Hidden: needs option and variant',
  'admin.noMenuMatches': 'No menu matches',
  'admin.noMenuMatchesHelp': 'Try another search.',
  'admin.noProductsInCategory': 'No products in this category yet.',
  'admin.productStep_category': 'Category',
  'admin.productStep_details': 'Details',
  'admin.productStep_variants': 'Variants',
  'admin.productStep_addons': 'Add-ons',
  'admin.productStep_review': 'Review',
  'admin.selectCategory': 'Select category',
  'admin.nameEn': 'Name (English)',
  'admin.nameAr': 'Name (Arabic)',
  'admin.descriptionEn': 'Description (English)',
  'admin.descriptionAr': 'Description (Arabic)',
  'admin.imageUrl': 'Image URL',
  'admin.photo': 'Photo',
  'admin.uploadPhoto': 'Upload photo',
  'admin.sortOrder': 'Sort order',
  'admin.price': 'Price',
  'admin.orderLimit': 'Order limit',
  'admin.unlimited': 'Unlimited',
  'admin.missingTranslation': 'Fill both languages',
  'admin.itemVisibilityHint': 'Needs active option and variant.',
  'admin.defaultOptionEn': 'Regular',
  'admin.defaultOptionAr': 'Regular AR',
  'admin.defaultVariantEn': 'One size',
  'admin.defaultVariantAr': 'One size AR',
  'admin.type': 'Option',
  'admin.size': 'Variant',
  'admin.addon': 'Add-on',
  'admin.item': 'Product',
  'admin.optionNameEn': 'Option name (English)',
  'admin.optionNameAr': 'Option name (Arabic)',
  'admin.variant': 'Variant',
  'admin.variantNameEn': 'Variant name (English)',
  'admin.variantNameAr': 'Variant name (Arabic)',
  'admin.addVariant': 'Add variant',
  'admin.addOptionGroup': 'Add option group',
  'admin.addonsOptional': 'Add-ons are optional.',
  'admin.reviewBeforePublish': 'Review before saving.',
  'admin.productNeedsVariant': 'Needs option and variant.',
  'admin.productIsVisible': 'Product is visible.',
  'admin.updateProduct': 'Update product',
  'admin.publishProduct': 'Publish product',
  'product.selectType': 'Select option',
  'product.selectSize': 'Select size',
  'product.selectAddons': 'Select add-ons',
  'product.addToCart': 'Add to cart',
};

const mockTranslate = (key: string) => translationMap[key] ?? key;

const latteItem: Item = {
  id: 'item-1',
  section_id: 'section-1',
  name_en: 'Latte',
  name_ar: 'لاتيه',
  description_en: 'Milk coffee',
  description_ar: 'قهوة بالحليب',
  image_url: null,
  sort_order: 0,
  is_active: true,
  item_types: [
    {
      id: 'type-1',
      item_id: 'item-1',
      name_en: 'Temperature',
      name_ar: 'الحرارة',
      image_url: null,
      sort_order: 0,
      is_active: true,
      sizes: [
        {
          id: 'size-1',
          type_id: 'type-1',
          name_en: 'Hot',
          name_ar: 'ساخن',
          image_url: null,
          price: '3.00',
          order_limit: null,
          sort_order: 0,
          is_active: true,
          addons: [],
        },
      ],
    },
  ],
};

const icedLatteItem: Item = {
  ...latteItem,
  id: 'item-2',
  name_en: 'Iced Latte',
  name_ar: 'آيس لاتيه',
  description_en: 'Cold Steam',
  description_ar: 'كولد ستيم',
  item_types: [
    {
      ...latteItem.item_types[0],
      id: 'type-2',
      item_id: 'item-2',
      sizes: [
        {
          ...latteItem.item_types[0].sizes[0],
          id: 'size-2',
          type_id: 'type-2',
        },
      ],
    },
  ],
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (callback: () => void) => {
    const React = require('react');
    React.useEffect(() => callback(), [callback]);
  },
}));

jest.mock('@/hooks/useAppTranslation', () => ({
  useAppTranslation: () => ({
    language: 'en',
    isRTL: false,
    t: mockTranslate,
  }),
}));

jest.mock('@/state/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    isRTL: false,
    toggleLanguage: jest.fn(),
  }),
}));

jest.mock('@/components/AppShell', () => ({
  AppShell: ({ children }: { children: any }) => children,
}));

jest.mock('@/components/TopAppBar', () => ({
  TopAppBar: ({ title }: { title?: string }) => {
    const { Text } = require('react-native');
    return title ? <Text>{title}</Text> : null;
  },
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('@/services/adminService', () => ({
  adminService: {
    getMenuTree: (...args: any[]) => mockGetMenuTree(...args),
    listSchedules: (...args: any[]) => mockListSchedules(...args),
    createSection: jest.fn(),
    createItem: jest.fn(),
    createType: jest.fn(),
    createSize: jest.fn(),
    createAddon: jest.fn(),
    updateMenuEntity: jest.fn(),
    deleteMenuEntity: jest.fn(),
    toggleMenuEntity: jest.fn(),
    uploadImage: jest.fn(),
  },
}));

describe('AdminMenuEditorScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMenuTree.mockResolvedValue({
      sections: [
        {
          id: 'section-1',
          name_en: 'Coffee',
          name_ar: 'قهوة',
          image_url: null,
          sort_order: 0,
          is_active: true,
          items: [latteItem, icedLatteItem],
        },
      ],
    });
    mockListSchedules.mockResolvedValue({ schedules: [] });
  });

  it('shows the rebuilt browse surface and opens product/preview routes', async () => {
    const { getByText, getAllByText, queryByText } = render(<AdminMenuEditorScreen />);

    await waitFor(() => {
      expect(getByText('Menu Editor')).toBeTruthy();
      expect(getByText('Add product')).toBeTruthy();
      expect(getByText('Coffee')).toBeTruthy();
      expect(getByText('Latte')).toBeTruthy();
      expect(getByText('Iced Latte')).toBeTruthy();
      expect(getByText('All subgroups')).toBeTruthy();
    });

    fireEvent.press(getAllByText('Cold Steam')[0]);

    await waitFor(() => {
      expect(getByText('Iced Latte')).toBeTruthy();
      expect(queryByText('Latte')).toBeNull();
    });

    fireEvent.press(getByText('All subgroups'));

    fireEvent.press(getByText('Add product'));
    expect(mockNavigate).toHaveBeenCalledWith('AdminMenuProductEditor', {});

    fireEvent.press(getAllByText('Preview as customer')[0]);
    expect(mockNavigate).toHaveBeenCalledWith('AdminMenuCustomerPreview', {
      item: latteItem,
      initialLanguage: 'en',
    });
  });

  it('creates a product through item, option, and variant endpoints in order', async () => {
    (adminService.createItem as jest.Mock).mockResolvedValue({ id: 'new-item' });
    (adminService.createType as jest.Mock).mockResolvedValue({ id: 'new-type' });
    (adminService.createSize as jest.Mock).mockResolvedValue({ id: 'new-size' });

    const route = { key: 'product', name: 'AdminMenuProductEditor' as const, params: { sectionId: 'section-1' } };
    const navigation = { goBack: mockGoBack, navigate: mockNavigate } as never;
    const { getAllByText, getByLabelText, getByText } = render(<AdminMenuProductEditorScreen route={route} navigation={navigation} />);

    await waitFor(() => {
      expect(getByText('Add-ons')).toBeTruthy();
      expect(getByText('Subgroups in this category')).toBeTruthy();
      expect(getByText('Cold Steam')).toBeTruthy();
    });

    fireEvent.press(getByText('Cold Steam'));
    fireEvent.press(getByText('Next'));
    expect(getByLabelText('Subgroup (English)').props.value).toBe('Cold Steam');
    fireEvent.changeText(getByLabelText('Name (English)'), 'Flat White');
    fireEvent.changeText(getByLabelText('Name (Arabic)'), 'فلات وايت');

    await waitFor(() => expect(getAllByText('Flat White').length).toBeGreaterThan(0));

    fireEvent.press(getByText('Next'));
    fireEvent.changeText(getByLabelText('Price'), '3.5');
    fireEvent.press(getByText('Next'));
    fireEvent.press(getByText('Next'));
    fireEvent.press(getByText('Publish product'));

    await waitFor(() => {
      expect(adminService.createItem).toHaveBeenCalledWith(
        expect.objectContaining({
          section_id: 'section-1',
          name_en: 'Flat White',
          name_ar: 'فلات وايت',
        }),
      );
      expect(adminService.createType).toHaveBeenCalledWith(
        expect.objectContaining({
          item_id: 'new-item',
          name_en: 'Regular',
          name_ar: 'Regular AR',
        }),
      );
      expect(adminService.createSize).toHaveBeenCalledWith(
        expect.objectContaining({
          type_id: 'new-type',
          name_en: 'One size',
          name_ar: 'One size AR',
          price: 3.5,
        }),
      );
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('renders full customer preview with disabled cart action', () => {
    const route = {
      key: 'preview',
      name: 'AdminMenuCustomerPreview' as const,
      params: { item: latteItem, initialLanguage: 'en' as const },
    };
    const navigation = { goBack: mockGoBack } as never;

    const { getByText } = render(<AdminMenuCustomerPreviewScreen route={route} navigation={navigation} />);

    expect(getByText('Customer preview')).toBeTruthy();
    expect(getByText('Latte')).toBeTruthy();
    expect(getByText('Preview only')).toBeTruthy();
    expect(getByText('Add to cart')).toBeTruthy();
  });
});
