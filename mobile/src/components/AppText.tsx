import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, Text, TextProps, TextStyle } from 'react-native';

import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';

type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodySmall' | 'caption' | 'button' | 'price';

type AppTextProps = PropsWithChildren<
  TextProps & {
    variant?: Variant;
    color?: string;
    align?: TextStyle['textAlign'];
    style?: StyleProp<TextStyle>;
  }
>;

export const AppText = ({ children, variant = 'body', color, align, style, ...rest }: AppTextProps) => {
  const { isRTL } = useLanguage();
  const fontFamily = isRTL ? arabicFontByVariant[variant] : englishFontByVariant[variant];
  return (
    <Text
      {...rest}
      style={[
        styles.base,
        styles[variant],
        { fontFamily },
        color ? { color } : null,
        { writingDirection: isRTL ? 'rtl' : 'ltr', textAlign: align ?? (isRTL ? 'right' : 'left') },
        style,
      ]}>
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    color: theme.colors.textPrimary,
    includeFontPadding: false,
  },
  display: theme.typography.display,
  h1: theme.typography.h1,
  h2: theme.typography.h2,
  h3: theme.typography.h3,
  body: theme.typography.body,
  bodySmall: theme.typography.bodySmall,
  caption: theme.typography.caption,
  button: theme.typography.button,
  price: theme.typography.price,
});

const englishFontByVariant: Record<Variant, string> = {
  display: 'Inter_700Bold',
  h1: 'Inter_700Bold',
  h2: 'Inter_700Bold',
  h3: 'Inter_600SemiBold',
  body: 'Inter_400Regular',
  bodySmall: 'Inter_400Regular',
  caption: 'Inter_400Regular',
  button: 'Inter_600SemiBold',
  price: 'Inter_700Bold',
};

const arabicFontByVariant: Record<Variant, string> = {
  display: 'IBMPlexSansArabic_700Bold',
  h1: 'IBMPlexSansArabic_700Bold',
  h2: 'IBMPlexSansArabic_700Bold',
  h3: 'IBMPlexSansArabic_600SemiBold',
  body: 'IBMPlexSansArabic_400Regular',
  bodySmall: 'IBMPlexSansArabic_400Regular',
  caption: 'IBMPlexSansArabic_400Regular',
  button: 'IBMPlexSansArabic_600SemiBold',
  price: 'IBMPlexSansArabic_700Bold',
};
