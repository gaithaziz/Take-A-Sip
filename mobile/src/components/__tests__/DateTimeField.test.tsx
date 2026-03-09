import { fireEvent, render } from '@testing-library/react-native';

import { DateTimeField } from '@/components/DateTimeField';

const mockPickerSelectedDate = new Date('2026-03-09T12:45:00.000Z');

jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return function MockPicker({ onChange }: { onChange: (event: { type: string }, value: Date) => void }) {
    return (
      <Pressable testID="picker-set" onPress={() => onChange({ type: 'set' }, mockPickerSelectedDate)}>
        <Text>mock-picker</Text>
      </Pressable>
    );
  };
});

jest.mock('@/hooks/useAppTranslation', () => ({
  useAppTranslation: () => ({
    language: 'en',
    isRTL: false,
    t: (key: string) => {
      const map: Record<string, string> = {
        'common.confirm': 'Confirm',
        'common.cancel': 'Cancel',
      };
      return map[key] ?? key;
    },
  }),
}));

jest.mock('@/state/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    isRTL: false,
    toggleLanguage: jest.fn(),
  }),
}));

describe('DateTimeField modal behavior', () => {
  it('does not call onChange when cancelling modal', () => {
    const onChange = jest.fn();
    const { getByText, getByTestId } = render(
      <DateTimeField label="Start time" mode="time" value={new Date('2026-03-09T09:00:00.000Z')} onChange={onChange} />,
    );

    fireEvent.press(getByText(/\d{2}:\d{2}/));
    fireEvent.press(getByTestId('picker-set'));
    fireEvent.press(getByText('Cancel'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('commits value on confirm', () => {
    const onChange = jest.fn();
    const { getByText, getByTestId } = render(
      <DateTimeField label="Start time" mode="time" value={new Date('2026-03-09T09:00:00.000Z')} onChange={onChange} />,
    );

    fireEvent.press(getByText(/\d{2}:\d{2}/));
    fireEvent.press(getByTestId('picker-set'));
    fireEvent.press(getByText('Confirm'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(mockPickerSelectedDate);
  });
});
