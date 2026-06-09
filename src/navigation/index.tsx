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
          fontWeight: '800',
        },
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen
        name="GalleryMain"
        component={GalleryScreen}
        options={{ headerShown: false }}
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
          headerShown: false,
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
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
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
        }}
      />
    </Tab.Navigator>
  );
}
