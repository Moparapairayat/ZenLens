/**
 * Glass Card Component
 * Glassmorphic card with Next-Zen aesthetic
 */
import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { useTheme } from '../styles/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function GlassCard({ children, style }: GlassCardProps): JSX.Element {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.glass,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    backdropFilter: 'blur(10px)',
  },
});
