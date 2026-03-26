import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { AdminReviewsScreen } from '@/screens/admin/AdminReviewsScreen';

const mockListRatings = jest.fn();
const translationMap: Record<string, string> = {
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.retry': 'Retry',
  'errors.generic': 'Something went wrong',
  'admin.reviewsTitle': 'All reviews',
  'admin.reviewsSubtitle': 'Browse the latest customer feedback.',
  'admin.noReviewsTitle': 'No reviews yet',
  'admin.noReviewsSubtitle': 'Completed order reviews will appear here.',
  'admin.showMore': 'Show more',
};
const mockTranslate = (key: string) => translationMap[key] ?? key;

jest.mock('@/hooks/useAppTranslation', () => ({
  useAppTranslation: () => ({
    language: 'en',
    isRTL: false,
    t: mockTranslate,
  }),
}));

jest.mock('@/components/AppShell', () => ({
  AppShell: ({ children }: { children: any }) => children,
}));

jest.mock('@/state/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    isRTL: false,
    toggleLanguage: jest.fn(),
  }),
}));

jest.mock('@/services/adminService', () => ({
  adminService: {
    listRatings: (...args: any[]) => mockListRatings(...args),
  },
}));

describe('AdminReviewsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads recent reviews and appends more results', async () => {
    mockListRatings.mockImplementation((limit: number, offset: number) => {
      if (offset === 0) {
        return Promise.resolve({
          ratings: Array.from({ length: 20 }, (_, index) => ({
            order_id: `order-${index + 1}`,
            stars: 5,
            note: index === 0 ? 'Newest note' : null,
            customer_name: `Client ${index + 1}`,
            created_at: `2026-03-${String(20 - index).padStart(2, '0')}T10:00:00Z`,
          })),
        });
      }

      return Promise.resolve({
        ratings: [
          {
            order_id: 'order-21',
            stars: 4,
            note: null,
            customer_name: 'Client 21',
            created_at: '2026-02-28T10:00:00Z',
          },
        ],
      });
    });

    const { getByText, queryByText } = render(
      <AdminReviewsScreen navigation={{} as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(getByText('All reviews')).toBeTruthy();
      expect(getByText('Client 1')).toBeTruthy();
      expect(getByText('Newest note')).toBeTruthy();
      expect(getByText('Show more')).toBeTruthy();
    });

    expect(queryByText('undefined')).toBeNull();

    fireEvent.press(getByText('Show more'));

    await waitFor(() => {
      expect(getByText('Client 21')).toBeTruthy();
    });

    expect(mockListRatings).toHaveBeenNthCalledWith(1, 20, 0);
    expect(mockListRatings).toHaveBeenNthCalledWith(2, 20, 20);
  });

  it('shows an empty state when there are no reviews', async () => {
    mockListRatings.mockResolvedValue({ ratings: [] });

    const { getByText } = render(
      <AdminReviewsScreen navigation={{} as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(getByText('No reviews yet')).toBeTruthy();
      expect(getByText('Completed order reviews will appear here.')).toBeTruthy();
    });
  });

  it('supports retry after a loading error', async () => {
    mockListRatings
      .mockRejectedValueOnce(new Error('Network issue'))
      .mockResolvedValueOnce({
        ratings: [
          {
            order_id: 'order-1',
            stars: 5,
            note: null,
            customer_name: 'Recovered Client',
            created_at: '2026-03-24T10:00:00Z',
          },
        ],
      });

    const { getByText } = render(
      <AdminReviewsScreen navigation={{} as never} route={{} as never} />,
    );

    await waitFor(() => {
      expect(getByText('Error')).toBeTruthy();
      expect(getByText('Something went wrong')).toBeTruthy();
    });

    fireEvent.press(getByText('Retry'));

    await waitFor(() => {
      expect(getByText('Recovered Client')).toBeTruthy();
    });
  });
});
