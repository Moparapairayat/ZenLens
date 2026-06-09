/**
 * ZenLens - Offline AI-powered photo gallery
 * Main app entry point
 */
import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation';
import { ThemeProvider } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import ProtectedWrapper from './src/components/ProtectedWrapper';
import { initializeDB } from './src/db/init';
import { initializeSecureStore } from './src/security/dbKey';

const BOOT_COLORS = {
  background: '#090A0F',
  surface: '#15131A',
  border: '#302D3A',
  primary: '#C8FF5C',
  accent: '#4DEEEA',
  text: '#F1F5F9',
  textSecondary: '#B8B6C7',
  error: '#F87171',
};

function AppShell({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>{children}</SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function BootScreen({
  errorMessage,
  onRetry,
}: {
  errorMessage?: string;
  onRetry?: () => void;
}): JSX.Element {
  const hasError = Boolean(errorMessage);

  return (
    <View style={styles.bootScreen}>
      <View style={styles.bootShell}>
        <View style={styles.bootMark}>
          <Text style={styles.bootMarkText}>Z</Text>
        </View>
        <Text style={styles.bootEyebrow}>{hasError ? 'STARTUP BLOCKED' : 'ZENLENS'}</Text>
        <Text style={styles.bootTitle}>{hasError ? 'Local engine needs attention' : 'Preparing local intelligence'}</Text>
        <Text style={styles.bootBody}>
          {hasError
            ? errorMessage
            : 'Opening the encrypted media index and warming the private gallery workspace.'}
        </Text>

        {hasError ? (
          <TouchableOpacity
            accessibilityLabel="Retry app initialization"
            onPress={onRetry}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        ) : (
          <ActivityIndicator color={BOOT_COLORS.primary} size="large" />
        )}
      </View>
    </View>
  );
}

/**
 * App Root Component
 * Sets up all providers and initializes critical services
 */
export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const initialize = React.useCallback(async () => {
    try {
      setInitError(null);
      setIsInitialized(false);

      // Initialize secure storage and DB encryption key
      await initializeSecureStore();

      // Initialize local database
      await initializeDB();

      setIsInitialized(true);
    } catch (error) {
      console.error('App initialization error:', error);
      setInitError(error instanceof Error ? error.message : 'Unknown initialization error');
      setIsInitialized(true); // Set true anyway to show error UI
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return (
      <AppShell>
        <BootScreen />
      </AppShell>
    );
  }

  if (initError) {
    return (
      <AppShell>
        <BootScreen errorMessage={initError} onRetry={initialize} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <ThemeProvider>
        <AuthProvider>
          <ProtectedWrapper>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </ProtectedWrapper>
        </AuthProvider>
      </ThemeProvider>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  bootScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: BOOT_COLORS.background,
  },
  bootShell: {
    width: '100%',
    maxWidth: 420,
    minHeight: 320,
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BOOT_COLORS.border,
    backgroundColor: BOOT_COLORS.surface,
    justifyContent: 'center',
    gap: 14,
  },
  bootMark: {
    width: 52,
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BOOT_COLORS.primary,
  },
  bootMarkText: {
    color: BOOT_COLORS.background,
    fontSize: 24,
    fontWeight: '900',
  },
  bootEyebrow: {
    color: BOOT_COLORS.accent,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  bootTitle: {
    color: BOOT_COLORS.text,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    letterSpacing: 0,
  },
  bootBody: {
    color: BOOT_COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BOOT_COLORS.primary,
  },
  retryButtonText: {
    color: BOOT_COLORS.background,
    fontSize: 14,
    fontWeight: '900',
  },
});
