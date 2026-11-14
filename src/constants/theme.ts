import { useColorScheme } from 'react-native';

const palette = {
  light: {
    primary: '#3B6FE0',
    onPrimary: '#FFFFFF',
    background: '#F6F7FB',
    card: '#FFFFFF',
    text: '#14171F',
    muted: '#6B7280',
    border: '#E3E6EE',
    danger: '#D93F3F',
  },
  dark: {
    primary: '#7FA3FF',
    onPrimary: '#0E1016',
    background: '#0E1016',
    card: '#181B24',
    text: '#F2F4F8',
    muted: '#9AA3B2',
    border: '#2A2F3B',
    danger: '#FF6B6B',
  },
};

export type Colors = typeof palette.light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? palette.dark : palette.light;
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
