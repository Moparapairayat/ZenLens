/**
 * Protected Wrapper Component
 * App-level protection with PIN and biometric authentication
 * Shows lock screen on app resume or after inactivity
 */
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTheme } from '../styles/theme';
import { useAuth } from '../context/AuthContext';
import { verifyPIN, isPINConfigured } from '../security/pinStore';
import { authenticateWithBiometric, isBiometricEnabled } from '../security/biometric';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const LOCK_SCREEN_SHOW_TIME = 500; // ms

interface ProtectedWrapperProps {
  children: React.ReactNode;
}

export default function ProtectedWrapper({ children }: ProtectedWrapperProps): JSX.Element {
  const theme = useTheme();
  const { isLocked, lockApp, unlockApp } = useAuth();

  const [pin, setPin] = useState('');
  const [pinError, setError] = useState('');
  const [pinConfigured, setPinConfigured] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const appState = useRef(AppState.currentState);
  const inactivityTimer = useRef<NodeJS.Timeout>();

  /**
   * Initialize PIN and biometric settings
   */
  useEffect(() => {
    const initializeSecurity = async () => {
      try {
        const isPinSet = await isPINConfigured();
        setPinConfigured(isPinSet);

        if (!isPinSet) {
          unlockApp();
        }

        const isBioEnabled = await isBiometricEnabled();
        setBiometricEnabled(isBioEnabled);
        setShowBiometric(isPinSet && isBioEnabled);
      } catch (error) {
        console.error('Failed to initialize security:', error);
        unlockApp();
      }
    };

    initializeSecurity();
  }, [unlockApp]);

  /**
   * Handle app state changes
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = (nextAppState: string) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to foreground
      if (pinConfigured) {
        lockApp();
      }
    } else {
      // App has gone to background
      // Start inactivity timer
      inactivityTimer.current = setTimeout(() => {
        if (pinConfigured) {
          lockApp();
        }
      }, INACTIVITY_TIMEOUT);
    }

    appState.current = nextAppState as AppStateStatus;
  };

  /**
   * Handle PIN verification
   */
  const handlePINSubmit = async () => {
    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }

    try {
      const isValid = await verifyPIN(pin);

      if (isValid) {
        setPin('');
        setError('');
        unlockApp();
      } else {
        setError('Incorrect PIN');
        setPin('');
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      setError('Verification failed');
    }
  };

  /**
   * Handle biometric authentication
   */
  const handleBiometricAuth = async () => {
    try {
      const success = await authenticateWithBiometric();
      if (success) {
        unlockApp();
      } else {
        setError('Biometric authentication failed');
      }
    } catch (error) {
      console.error('Biometric error:', error);
      setError('Authentication error');
    }
  };

  if (!isLocked || !pinConfigured) {
    return <>{children}</>;
  }

  return (
    <>
      {children}

      {/* Lock Screen Overlay */}
      <Animated.View
        style={[
          styles.overlay,
          {
            backgroundColor: theme.colors.background,
          },
        ]}
        entering={FadeIn.duration(LOCK_SCREEN_SHOW_TIME)}
        exiting={FadeOut.duration(300)}
      >
        <View style={styles.lockContainer}>
          {/* Logo / Header */}
          <View style={styles.header}>
            <Ionicons name="lock-closed" size={48} color={theme.colors.primary} />
            <Text
              style={[
                styles.title,
                {
                  color: theme.colors.text,
                },
              ]}
            >
              ZenLens Locked
            </Text>
          </View>

          {/* PIN Input */}
          <View style={styles.pinInputContainer}>
            <TextInput
              style={[
                styles.pinInput,
                {
                  color: theme.colors.text,
                  borderColor: pinError ? theme.colors.error : theme.colors.border,
                },
              ]}
              placeholder="Enter PIN"
              placeholderTextColor={theme.colors.textTertiary}
              value={pin}
              onChangeText={(text) => {
                setPin(text);
                setError('');
              }}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={4}
              editable={!showBiometric}
            />

            {pinError && (
              <Text
                style={[
                  styles.errorText,
                  {
                    color: theme.colors.error,
                  },
                ]}
              >
                {pinError}
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              onPress={handlePINSubmit}
            >
              <Text style={styles.buttonText}>Unlock</Text>
            </TouchableOpacity>

            {showBiometric && (
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: theme.colors.secondary,
                  },
                ]}
                onPress={handleBiometricAuth}
              >
                <Ionicons name="finger-print" size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>Biometric</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  lockContainer: {
    width: '80%',
    alignItems: 'center',
    gap: 32,
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  pinInputContainer: {
    width: '100%',
    gap: 8,
  },
  pinInput: {
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 4,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
