import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { AdminMenuEditorScreen } from '@/screens/admin/AdminMenuEditorScreen';
import { adminService } from '@/services/adminService';

const mockGetMenuTree = jest.fn();
const mockListSchedules = jest.fn();
const translationMap: Record<string, string> = {
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.retry': 'Retry',
  'common.cancel': 'Cancel',
  'admin.menuEditorTitle': 'Menu Editor',
  'admin.quickActions': 'Quick actions',
  'admin.menuHierarchy': 'Menu Hierarchy',
  'admin.createSection': 'Create section',
  'admin.createItem': 'Create item',
  'admin.createType': 'Create type',
  'admin.createSize': 'Create size',
  'admin.createAddon': 'Create add-on',
  'admin.saveChanges': 'Save changes',
  'admin.searchMenu': 'Search menu',
  'admin.searchMenuPlaceholder': 'Search the menu hierarchy',
  'admin.filterAll': 'All',
  'admin.active': 'Active',
  'admin.inactive': 'Inactive',
  'admin.filterIssues': 'Needs review',
  'admin.currentContext': 'Selected path',
  'admin.noContextSelected': 'Select a section or item from the hierarchy to choose where add and move actions should apply.',
  'admin.section': 'Section',
  'admin.item': 'Item',
  'admin.type': 'Type',
  'admin.size': 'Size',
  'admin.addon': 'Add-on',
  'admin.addChild': 'Add',
  'admin.edit': 'Edit',
  'admin.more': 'More',
  'admin.none': 'None',
  'admin.visibilityVisible': 'Visible',
  'admin.visibilityNeedsActiveItemPath': 'Hidden: needs active item path',
  'admin.nameEn': 'Name (English)',
  'admin.nameAr': 'Name (Arabic)',
  'admin.descriptionEn': 'Description (English)',
  'admin.descriptionAr': 'Description (Arabic)',
  'admin.sortOrder': 'Sort order',
  'admin.photo': 'Photo',
  'admin.uploadPhoto': 'Upload photo',
  'admin.itemVisibilityHint': 'Items appear for customers only after they have at least one active type and one active size.',
  'admin.orderLimit': 'Order limit',
  'admin.unlimited': 'Unlimited',
  'admin.move': 'Move',
  'admin.disable': 'Disable',
  'admin.enable': 'Enable',
  'admin.delete': 'Delete',
  'admin.scheduled': 'Scheduled',
};
const mockTranslate = (key: string) => translationMap[key] ?? key;

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
          name_ar: 'Coffee',
          image_url: null,
          sort_order: 0,
          is_active: true,
          items: [],
        },
        {
          id: 'section-2',
          name_en: 'Tea',
          name_ar: 'Tea',
          image_url: null,
          sort_order: 1,
          is_active: true,
          items: [],
        },
      ],
    });
    mockListSchedules.mockResolvedValue({ schedules: [] });
  });

  it('switches to the item workflow from a section row and scopes the parent selector to the selected branch', async () => {
    const { getByText, getByLabelText, queryByLabelText, getAllByText, queryByText } = render(<AdminMenuEditorScreen />);

    await waitFor(() => {
      expect(mockGetMenuTree).toHaveBeenCalled();
      expect(queryByText('Loading...')).toBeNull();
      expect(getByText('Menu Editor')).toBeTruthy();
      expect(getByText('Section: Coffee (0)')).toBeTruthy();
    });

    fireEvent.press(getByText('Section: Coffee (0)'));
    fireEvent.press(getAllByText('Add')[0]);

    await waitFor(() => {
      expect(getAllByText('Create item').length).toBeGreaterThan(0);
      expect(getByLabelText('Coffee')).toBeTruthy();
      expect(queryByLabelText('Tea')).toBeNull();
    });
  });

  it('sends edited menu fields to the backend and reloads the tree', async () => {
    mockGetMenuTree.mockResolvedValue({
      sections: [
        {
          id: 'section-1',
          name_en: 'Coffee',
          name_ar: 'قهوة',
          image_url: null,
          sort_order: 0,
          is_active: true,
          items: [
            {
              id: 'item-1',
              section_id: 'section-1',
              name_en: 'Latte',
              name_ar: 'لاتيه',
              description_en: 'Milk',
              description_ar: 'حليب',
              image_url: null,
              sort_order: 1,
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
            },
          ],
        },
      ],
    });
    (adminService.updateMenuEntity as jest.Mock).mockResolvedValue({ id: 'item-1' });

    const { getByLabelText, getByText, getAllByText } = render(<AdminMenuEditorScreen />);

    await waitFor(() => {
      expect(getByText('Menu Editor')).toBeTruthy();
    });

    fireEvent.changeText(getByLabelText('Search menu'), 'Latte');

    await waitFor(() => {
      expect(getByText('Item: Latte (1)')).toBeTruthy();
    });

    fireEvent.press(getAllByText('Edit')[1]);
    fireEvent.changeText(getByLabelText('Name (English)'), 'Flat White');
    fireEvent.changeText(getByLabelText('Sort order'), '5');
    fireEvent.press(getByText('Save changes'));

    await waitFor(() => {
      expect(adminService.updateMenuEntity).toHaveBeenCalledWith('item', 'item-1', {
        sort_order: 5,
        name_en: 'Flat White',
        name_ar: 'لاتيه',
        image_url: null,
        description_en: 'Milk',
        description_ar: 'حليب',
      });
      expect(mockGetMenuTree).toHaveBeenCalledTimes(2);
    });
  });
});
