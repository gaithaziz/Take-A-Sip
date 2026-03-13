export const colors = {
  primary50: '#fdf3e8',
  primary100: '#f8e3cc',
  primary200: '#edcda4',
  primary300: '#ddae77',
  primary400: '#c78b4d',
  primary500: '#b46e1e',
  primary600: '#9b5f1b',
  primary700: '#8b5316',
  secondaryCream: '#fff8f1',
  secondarySand: '#f7efe6',
  secondaryCaramel: '#d8a15b',
  background: '#fff8f1',
  surface: '#ffffff',
  sectionBackground: '#f7efe6',
  textPrimary: '#1f1713',
  textSecondary: '#6e6258',
  textMuted: '#938578',
  border: '#e7d7c8',
  success: '#4f7a52',
  warning: '#c98a2e',
  error: '#c95a4a',
  info: '#6a7f8c',
  successSurface: '#edf5ee',
  warningSurface: '#fdf4e8',
  errorSurface: '#fbecea',
  infoSurface: '#edf3f6',
  accent: '#d8a15b',
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
    shadowColor: '#8b5316',
    shadowOpacity: 0.09,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  floating: {
    shadowColor: '#8b5316',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
} as const;

export const typography = {
  display: { fontSize: 32, lineHeight: 38 },
  h1: { fontSize: 28, lineHeight: 34 },
  h2: { fontSize: 20, lineHeight: 26 },
  h3: { fontSize: 18, lineHeight: 24 },
  body: { fontSize: 16, lineHeight: 24 },
  bodySmall: { fontSize: 14, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 16 },
  button: { fontSize: 16, lineHeight: 22 },
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
