export const colors = {
  primary50: '#f9f3ea',
  primary100: '#f2e5d2',
  primary200: '#e5c9a3',
  primary300: '#d0a877',
  primary400: '#b98753',
  primary500: '#8d5d33',
  primary600: '#734827',
  primary700: '#56341c',
  secondaryCream: '#fff7eb',
  secondarySand: '#f3e8d9',
  secondaryCaramel: '#dcc3a1',
  background: '#f8f4ef',
  surface: '#ffffff',
  sectionBackground: '#f3ece3',
  textPrimary: '#2e2620',
  textSecondary: '#6b5f55',
  textMuted: '#9b8f84',
  border: '#e9dfd3',
  success: '#3c8f5a',
  warning: '#b37a1f',
  error: '#b14846',
  info: '#557389',
  white: '#ffffff',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const shadows = {
  card: {
    shadowColor: '#2e2620',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  floating: {
    shadowColor: '#2e2620',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
} as const;

export const typography = {
  display: { fontSize: 34, lineHeight: 42 },
  h1: { fontSize: 28, lineHeight: 34 },
  h2: { fontSize: 22, lineHeight: 28 },
  h3: { fontSize: 18, lineHeight: 24 },
  body: { fontSize: 16, lineHeight: 24 },
  bodySmall: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16 },
  price: { fontSize: 18, lineHeight: 24 },
};

export const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
};

export const theme = {
  colors,
  spacing,
  radius,
  shadows,
  typography,
  iconSizes,
};
