import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ActionRow } from '@/components/admin/ActionRow';
import { InfoLine } from '@/components/admin/InfoLine';

const languageState = { isRTL: false };

jest.mock('@/state/LanguageContext', () => ({
  useLanguage: () => ({
    language: languageState.isRTL ? 'ar' : 'en',
    isRTL: languageState.isRTL,
    toggleLanguage: jest.fn(),
  }),
}));

describe('admin layout direction', () => {
  it('uses row in LTR mode', () => {
    languageState.isRTL = false;
    const tree = render(
      <ActionRow>
        <Text>one</Text>
      </ActionRow>,
    ).toJSON();
    const styles = Array.isArray(tree?.props?.style) ? tree.props.style : [tree?.props?.style];
    expect(styles.some((style: { flexDirection?: string } | null | undefined) => style?.flexDirection === 'row')).toBe(true);
  });

  it('uses row-reverse in RTL mode', () => {
    languageState.isRTL = true;
    const tree = render(<InfoLine label="Role" value="Admin" />).toJSON();
    const styles = Array.isArray(tree?.props?.style) ? tree.props.style : [tree?.props?.style];
    expect(styles.some((style: { flexDirection?: string } | null | undefined) => style?.flexDirection === 'row-reverse')).toBe(true);
  });
});
