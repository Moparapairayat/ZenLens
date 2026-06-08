/**
 * Biometric Authentication
 * Wrapper around native biometric APIs
 */
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'zenlens_biometric_enabled';

/**
 * Check if biometric hardware is available
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  } catch (error) {
    console.error('Failed to check biometric availability:', error);
    return false;
  }
}

/**
 * Get available biometric types
 */
export async function getAvailableBiometrics(): Promise<LocalAuthentication.AuthenticationType[]> {
  try {
    const available = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return available;
  } catch (error) {
    console.error('Failed to get available biometrics:', error);
    return [];
  }
}

/**
 * Authenticate with biometric
 */
export async function authenticateWithBiometric(reason: string = 'Unlock ZenLens'): Promise<boolean> {
  try {
    const available = await isBiometricAvailable();
    if (!available) {
      console.warn('Biometric not available');
      return false;
    }

    const result = await LocalAuthentication.authenticateAsync({
      disableDeviceFallback: false,
      reason,
      fallbackLabel: 'Use PIN instead',
    });

    return result.success;
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return false;
  }
}

/**
 * Enable biometric authentication
 */
export async function enableBiometric(): Promise<void> {
  try {
    const available = await isBiometricAvailable();
    if (!available) {
      throw new Error('Biometric not available on this device');
    }

    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
    console.log('Biometric authentication enabled');
  } catch (error) {
    console.error('Failed to enable biometric:', error);
    throw error;
  }
}

/**
 * Disable biometric authentication
 */
export async function disableBiometric(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    console.log('Biometric authentication disabled');
  } catch (error) {
    console.error('Failed to disable biometric:', error);
    throw error;
  }
}

/**
 * Check if biometric is enabled
 */
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('Failed to check biometric enabled status:', error);
    return false;
  }
}
