/**
 * Theme Context and Provider
 * Provides ZenLens design tokens and cinematic aesthetic
 */
import React, { createContext, useContext, ReactNode } from 'react';
import { ColorSchemeName } from 'react-native';

/**
 * ZenLens design tokens - Next-Zen aesthetic
 * Glass cards, neon accents, depth parallax
 */
export const ThemeTokens = {
  light: {
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    primary: '#7C3AED', // Neon violet
    secondary: '#EC4899', // Neon pink
    accent: '#06B6D4', // Cyan
    text: '#1F2937',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    border: '#E5E7EB',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    glass: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#000000',
  },
  dark: {
    background: '#0F172A',
    surface: '#1E293B',
    surfaceVariant: '#334155',
    primary: '#A78BFA', // Neon violet
    secondary: '#F472B6', // Neon pink
    accent: '#22D3EE', // Cyan
    text: '#F1F5F9',
    textSecondary: '#CBD5E1',
    textTertiary: '#94A3B8',
    border: '#475569',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    glass: 'rgba(30, 41, 59, 0.7)',
    shadowColor: '#000000',
  },
};

export interface Theme {
  colors: typeof ThemeTokens.light;
  isDark: boolean;
  spacing: (factor: number) => number;
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    h1: { fontSize: number; fontWeight: '700' };
    h2: { fontSize: number; fontWeight: '600' };
    body: { fontSize: number; fontWeight: '400' };
    caption: { fontSize: number; fontWeight: '400' };
  };
}

const ThemeContext = createContext<Theme | undefined>(undefined);

/**
 * Create theme object from tokens
 */
function createTheme(isDark: boolean): Theme {
  const colors = isDark ? ThemeTokens.dark : ThemeTokens.light;
  return {
    colors,
    isDark,
    spacing: (factor: number) => factor * 8,
    borderRadius: {
      sm: 8,
      md: 12,
      lg: 16,
      xl: 24,
    },
    typography: {
      h1: { fontSize: 28, fontWeight: '700' },
      h2: { fontSize: 20, fontWeight: '600' },
      body: { fontSize: 14, fontWeight: '400' },
      caption: { fontSize: 12, fontWeight: '400' },
    },
  };
}

/**
 * Theme Provider Component
 */
export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  // TODO: Add persistent theme preference storage
  const isDark = true; // Default to dark for cinematic aesthetic
  const theme = createTheme(isDark);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access theme
 */
export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return theme;
}
