/**
 * Holographic Search Bar Component
 * Animated search input with neon aesthetic
 */
import React, { useState, useRef } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';

interface HoloSearchBarProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
}

export default function HoloSearchBar({
  placeholder,
  value,
  onChangeText,
}: HoloSearchBarProps): JSX.Element {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = (): void => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = (): void => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isFocused ? theme.colors.primary : theme.colors.border,
            borderWidth: 1,
          },
        ]}
      >
        <Ionicons
          name="search"
          size={20}
          color={isFocused ? theme.colors.primary : theme.colors.textTertiary}
          style={styles.icon}
        />

        <TextInput
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            styles.input,
            {
              color: theme.colors.text,
            },
          ]}
          accessibilityLabel="Search"
        />

        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  icon: {
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
});
