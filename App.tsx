/**
 * ZenLens - Offline AI-powered photo gallery
 * Main app entry point
 */
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { ProtectedWrapper } from './src/components/ProtectedWrapper';
import { initializeDB } from './src/db/init';
import { initializeSecureStore } from './src/security/dbKey';

/**
 * App Root Component
 * Sets up all providers and initializes critical services
 */
export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize secure storage and DB encryption key
        await initializeSecureStore();

        // Initialize local database
        await initializeDB();

        setIsInitialized(true);
      } catch (error) {
        console.error('App initialization error:', error);
        setInitError(
          error instanceof Error ? error.message : 'Unknown initialization error'
        );
        setIsInitialized(true); // Set true anyway to show error UI
      }
    };

    initialize();
  }, []);

  if (!isInitialized) {
    // Show loading screen or splash
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider />
      </GestureHandlerRootView>
    );
  }

  if (initError) {
    // TODO: Implement error boundary screen
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <ProtectedWrapper>
              <NavigationContainer>
                <RootNavigator />
              </NavigationContainer>
            </ProtectedWrapper>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
