import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { AdminScheduleEditorScreen } from '@/screens/admin/AdminScheduleEditorScreen';
import { AdminSchedulingScreen } from '@/screens/admin/AdminSchedulingScreen';

const mockListSchedules = jest.fn();
const mockGetMenuTree = jest.fn();
const mockCreateSchedule = jest.fn();
const mockUpdateSchedule = jest.fn();
const mockDeleteSchedule = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockRouteParams: Record<string, unknown> | undefined;

const translationMap: Record<string, string> = {
  'common.error': 'Error',
  'common.retry': 'Retry',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.back': 'Back',
  'validation.requiredFields': 'Required fields',
  'admin.targetNoLongerAvailable': 'One or more selected menu targets no longer exist. Refresh the menu targets and choose them again.',
  'admin.deletedMenuTarget': 'Unavailable menu target',
  'admin.schedulingTitle': 'Scheduling',
  'admin.schedulingBrowseSubtitle': 'Control availability.',
  'admin.addSchedule': 'Add schedule',
  'admin.allSchedules': 'All schedules',
  'admin.active': 'Active',
  'admin.inactive': 'Inactive',
  'admin.allTargets': 'All targets',
  'admin.allDays': 'All days',
  'admin.searchSchedules': 'Search schedules',
  'admin.searchSchedulesPlaceholder': 'Search scheduled menu targets',
  'admin.loadingMenuLabels': 'Loading menu labels...',
  'admin.previewWholeMenu': 'Preview whole menu',
  'admin.noSchedulesTitle': 'No schedules',
  'admin.noSchedulesSubtitle': 'Create a schedule to control availability.',
  'admin.section': 'Section',
  'admin.item': 'Item',
  'admin.type': 'Type',
  'admin.size': 'Size',
  'admin.addon': 'Add-on',
  'admin.subgroup': 'Subgroup',
  'admin.storeTimezone': 'Store timezone',
  'admin.timeRange': 'Time range',
  'admin.daysOfWeek': 'Days of week',
  'admin.dayMon': 'Monday',
  'admin.dayTue': 'Tuesday',
  'admin.dayWed': 'Wednesday',
  'admin.dayThu': 'Thursday',
  'admin.dayFri': 'Friday',
  'admin.daySat': 'Saturday',
  'admin.daySun': 'Sunday',
  'admin.edit': 'Edit',
  'admin.enable': 'Enable',
  'admin.disable': 'Disable',
  'admin.delete': 'Delete',
  'admin.deleteSchedule': 'Delete schedule',
  'admin.deleteScheduleConfirm': 'This schedule will be removed.',
  'admin.createSchedule': 'Create schedule',
  'admin.editSchedule': 'Edit schedule',
  'admin.saveChanges': 'Save changes',
  'admin.scheduleEditorSubtitle': 'Pick a menu level.',
  'admin.scheduleTarget': 'Schedule target',
  'admin.scheduleTargetHelp': 'Choose a menu level.',
  'admin.scheduleEditTargetLocked': 'Existing schedules keep their target.',
  'admin.targetSearch': 'Search menu targets',
  'admin.targetSearchPlaceholder': 'Search menu targets',
  'admin.searchSubgroupsPlaceholder': 'Search subgroups',
  'admin.noMatchingTargets': 'No matching targets',
  'admin.selectedTargets': 'Selected targets',
  'admin.noTargetsSelected': 'No menu targets selected yet.',
  'admin.selected': 'Selected',
  'admin.itemsLabel': 'items',
  'admin.everyDay': 'Every day',
  'admin.weekdays': 'Weekdays',
  'admin.weekend': 'Weekend',
  'admin.reviewAndPreview': 'Review and preview',
  'admin.subgroupScheduleFanout': 'This subgroup will create item schedules:',
  'admin.scheduleAvailabilityHint': 'Available only during selected times.',
  'admin.invalidTimeRange': 'Start and end time cannot be the same.',
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

jest.mock('@/components/DateTimeField', () => ({
  DateTimeField: ({ label }: any) => {
    const { Text } = require('react-native');
    return <Text>{label}</Text>;
  },
}));

jest.mock('@/services/adminService', () => ({
  adminService: {
    listSchedules: (...args: any[]) => mockListSchedules(...args),
    getMenuTree: (...args: any[]) => mockGetMenuTree(...args),
    createSchedule: (...args: any[]) => mockCreateSchedule(...args),
    updateSchedule: (...args: any[]) => mockUpdateSchedule(...args),
    deleteSchedule: (...args: any[]) => mockDeleteSchedule(...args),
  },
}));

const menuTree = {
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
          name_en: 'Iced Latte',
          name_ar: 'لاتيه مثلج',
          description_en: 'Cold Steam',
          description_ar: 'كولد ستيم',
          image_url: null,
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
          name_en: 'Iced Mocha',
          name_ar: 'موكا مثلجة',
          description_en: 'Cold Steam',
          description_ar: 'كولد ستيم',
          image_url: null,
          sort_order: 2,
          is_active: true,
          item_types: [],
        },
      ],
    },
  ],
};

const menuTreeWithoutNestedTargets = () => ({
  sections: [
    {
      ...menuTree.sections[0],
      items: menuTree.sections[0].items.map((item) => ({ ...item, item_types: [] })),
    },
  ],
});

const menuTreeWithoutSubgroups = () => ({
  sections: [
    {
      ...menuTree.sections[0],
      items: menuTree.sections[0].items.map((item) => ({
        ...item,
        description_en: null,
        description_ar: null,
      })),
    },
  ],
});

describe('AdminSchedulingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = undefined;
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    mockListSchedules.mockResolvedValue({
      schedules: [
        {
          id: 'schedule-1',
          entity_type: 'section',
          entity_id: 'section-1',
          start_time: '07:00',
          end_time: '11:00',
          days_of_week: [0, 1, 2],
          is_active: true,
        },
      ],
    });
    mockGetMenuTree.mockResolvedValue(menuTree);
    mockCreateSchedule.mockResolvedValue({ schedule_id: 'new-schedule' });
    mockUpdateSchedule.mockResolvedValue({ id: 'schedule-1' });
    mockDeleteSchedule.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows schedules without blocking on the hierarchy picker', async () => {
    const { getByText } = render(<AdminSchedulingScreen />);

    await waitFor(() => {
      expect(getByText('Scheduling')).toBeTruthy();
      expect(getByText('07:00 - 11:00')).toBeTruthy();
    });

    expect(mockListSchedules).toHaveBeenCalledTimes(1);
    expect(mockGetMenuTree).toHaveBeenCalledTimes(1);
  });

  it('creates one item schedule for each selected subgroup item', async () => {
    const { getAllByText, getByLabelText, getByText } = render(<AdminScheduleEditorScreen />);

    await waitFor(() => {
      expect(getByText('Schedule target')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('Subgroup'));
    await waitFor(() => {
      expect(getByText('Cold Steam')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('Cold Steam'));
    fireEvent.press(getAllByText('Create schedule').at(-1)!);

    await waitFor(() => {
      expect(mockCreateSchedule).toHaveBeenCalledTimes(2);
      expect(mockCreateSchedule).toHaveBeenCalledWith(expect.objectContaining({ entity_type: 'item', entity_id: 'item-1' }));
      expect(mockCreateSchedule).toHaveBeenCalledWith(expect.objectContaining({ entity_type: 'item', entity_id: 'item-2' }));
    });
    expect(mockGetMenuTree).toHaveBeenCalledWith({ force: true });
  });

  it('creates a nested size schedule after refreshing the menu targets', async () => {
    const { getAllByText, getByLabelText, getByText } = render(<AdminScheduleEditorScreen />);

    await waitFor(() => {
      expect(getByText('Schedule target')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('Size'));
    await waitFor(() => {
      expect(getByText('Coffee > Iced Latte > Hot > Large')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('Coffee > Iced Latte > Hot > Large'));
    fireEvent.press(getAllByText('Create schedule').at(-1)!);

    await waitFor(() => {
      expect(mockCreateSchedule).toHaveBeenCalledWith(expect.objectContaining({ entity_type: 'size', entity_id: 'size-1' }));
    });
    expect(mockGetMenuTree).toHaveBeenCalledWith({ force: true });
  });

  it('blocks a stale size schedule after refreshing the menu targets', async () => {
    mockGetMenuTree.mockResolvedValueOnce(menuTree).mockResolvedValueOnce(menuTreeWithoutNestedTargets());
    const { getAllByText, getByLabelText, getByText } = render(<AdminScheduleEditorScreen />);

    await waitFor(() => {
      expect(getByText('Schedule target')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('Size'));
    await waitFor(() => {
      expect(getByText('Coffee > Iced Latte > Hot > Large')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('Coffee > Iced Latte > Hot > Large'));
    fireEvent.press(getAllByText('Create schedule').at(-1)!);

    await waitFor(() => {
      expect(mockCreateSchedule).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'One or more selected menu targets no longer exist. Refresh the menu targets and choose them again.',
      );
    });
    expect(mockGetMenuTree).toHaveBeenCalledWith({ force: true });
  });

  it('blocks a stale subgroup schedule after refreshing the menu targets', async () => {
    mockGetMenuTree.mockResolvedValueOnce(menuTree).mockResolvedValueOnce(menuTreeWithoutSubgroups());
    const { getAllByText, getByLabelText, getByText } = render(<AdminScheduleEditorScreen />);

    await waitFor(() => {
      expect(getByText('Schedule target')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('Subgroup'));
    await waitFor(() => {
      expect(getByText('Cold Steam')).toBeTruthy();
    });
    fireEvent.press(getByLabelText('Cold Steam'));
    fireEvent.press(getAllByText('Create schedule').at(-1)!);

    await waitFor(() => {
      expect(mockCreateSchedule).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'One or more selected menu targets no longer exist. Refresh the menu targets and choose them again.',
      );
    });
    expect(mockGetMenuTree).toHaveBeenCalledWith({ force: true });
  });

  it('does not save a schedule with identical start and end times', async () => {
    mockRouteParams = {
      schedule: {
        id: 'schedule-equal',
        entity_type: 'section',
        entity_id: 'section-1',
        start_time: '07:00',
        end_time: '07:00',
        days_of_week: [0, 1],
        is_active: true,
      },
    };
    const { getAllByText, getByText } = render(<AdminScheduleEditorScreen />);

    await waitFor(() => {
      expect(getByText('Edit schedule')).toBeTruthy();
    });

    fireEvent.press(getAllByText('Save changes').at(-1)!);

    expect(mockUpdateSchedule).not.toHaveBeenCalled();
  });
});
