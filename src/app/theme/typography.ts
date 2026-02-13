import { Platform } from 'react-native';

export const fonts = {
  heading: Platform.select({
    ios: 'Avenir-Heavy',
    android: 'sans-serif-medium',
    default: 'System',
  }),
  body: Platform.select({
    ios: 'Avenir-Book',
    android: 'sans-serif',
    default: 'System',
  }),
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 26,
  xxl: 32,
};
