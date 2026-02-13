import { DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';
import { colors } from './colors';

export const appTheme = {
  colors,
};

export const navigationTheme = {
  ...NavigationDefaultTheme,
  colors: {
    ...NavigationDefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    border: colors.border,
    text: colors.text,
    primary: colors.primary,
  },
};
