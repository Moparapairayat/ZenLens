/**
 * Navigation Configuration
 * Root navigator with stack, tab, and modal layouts
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import GalleryScreen from '../screens/GalleryScreen';
import PhotoViewScreen from '../screens/PhotoViewScreen';
import EditorScreen from '../screens/EditorScreen';
import SearchScreen from '../screens/SearchScreen';
import SmartAlbumsScreen from '../screens/SmartAlbumsScreen';
import { useTheme } from '../styles/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Gallery Stack Navigator
 */
function GalleryStackNavigator() {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: '600',
        },
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen
        name="GalleryMain"
        component={GalleryScreen}
        options={{ title: 'ZenLens Gallery' }}
      />
      <Stack.Screen
        name="PhotoView"
        component={PhotoViewScreen}
        options={{
          title: '',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Editor"
        component={EditorScreen}
        options={{
          title: 'Edit Photo',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
}

/**
 * Root Navigator
 */
export function RootNavigator(): JSX.Element {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="GalleryTab"
        component={GalleryStackNavigator}
        options={{
          title: 'Gallery',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="images" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
          headerShown: true,
        }}
      />
      <Tab.Screen
        name="AlbumsTab"
        component={SmartAlbumsScreen}
        options={{
          title: 'Albums',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="folder" size={size} color={color} />
          ),
          headerShown: true,
        }}
      />
    </Tab.Navigator>
  );
}
