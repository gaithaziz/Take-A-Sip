import { fireEvent, render } from '@testing-library/react-native';

import { ExpandableText } from '@/components/admin/ExpandableText';

const translationMap: Record<string, string> = {
  'admin.showMore': 'Show more',
  'admin.showLess': 'Show less',
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

describe('ExpandableText', () => {
  it('toggles inline expansion instead of opening an alert', () => {
    const { getByText, queryByText } = render(
      <ExpandableText
        value="This is a long note that should expose inline expansion controls for admins to inspect more comfortably."
        numberOfLines={1}
      />,
    );

    expect(getByText('Show more')).toBeTruthy();
    expect(queryByText('Show less')).toBeNull();

    fireEvent.press(getByText('Show more'));

    expect(getByText('Show less')).toBeTruthy();
  });
});
