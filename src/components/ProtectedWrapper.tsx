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
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (inactivityTimer.current) {
        clearTimeout(inactivityTimer.current);
      }
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
          <View style={[styles.lockMark, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="lock-closed" size={26} color="#090A0F" />
          </View>

          <View style={styles.header}>
            <Text style={[styles.eyebrow, { color: theme.colors.accent }]}>PRIVATE VAULT</Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>ZenLens locked</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Enter your 4-digit key to restore local access.
            </Text>
          </View>

          <View style={styles.pinInputContainer}>
            <View style={styles.pinDots}>
              {[0, 1, 2, 3].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.pinDot,
                    {
                      borderColor: pinError ? theme.colors.error : theme.colors.border,
                      backgroundColor: pin.length > index ? theme.colors.primary : theme.colors.surface,
                    },
                  ]}
                />
              ))}
            </View>

            <TextInput
              style={[
                styles.pinInput,
                {
                  color: theme.colors.text,
                  borderColor: pinError ? theme.colors.error : theme.colors.border,
                  backgroundColor: theme.colors.surface,
                },
              ]}
              placeholder="PIN"
              placeholderTextColor={theme.colors.textTertiary}
              value={pin}
              onChangeText={(text) => {
                setPin(text.replace(/\D/g, ''));
                setError('');
              }}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={4}
              editable
              accessibilityLabel="Enter 4 digit PIN"
            />

            {pinError && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                {pinError}
              </Text>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                {
                  backgroundColor: theme.colors.primary,
                },
              ]}
              onPress={handlePINSubmit}
              accessibilityLabel="Unlock with PIN"
            >
              <Ionicons name="key-outline" size={19} color="#090A0F" />
              <Text style={styles.primaryButtonText}>Unlock</Text>
            </TouchableOpacity>

            {showBiometric && (
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  {
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={handleBiometricAuth}
                accessibilityLabel="Unlock with biometric authentication"
              >
                <Ionicons name="finger-print" size={20} color={theme.colors.text} />
                <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Biometric</Text>
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
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    zIndex: 999,
  },
  lockContainer: {
    width: '100%',
    maxWidth: 390,
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    gap: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(21, 19, 26, 0.92)',
  },
  lockMark: {
    width: 58,
    height: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    gap: 6,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0,
  },
  subtitle: {
    maxWidth: 270,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  pinInputContainer: {
    width: '100%',
    gap: 12,
  },
  pinDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  pinDot: {
    width: 34,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
  },
  pinInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 4,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  button: {
    flexDirection: 'row',
    minHeight: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#090A0F',
    fontSize: 14,
    fontWeight: '900',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '900',
  },
});
