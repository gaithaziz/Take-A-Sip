import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { AdminMenuEditorScreen } from '@/screens/admin/AdminMenuEditorScreen';

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
});
