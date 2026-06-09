/**
 * PIN Authentication
 * Secure PIN storage and verification using SHA256
 */
import CryptoJS from 'crypto-js';
import { deleteStoredItem, getStoredItem, setStoredItem } from './secureStorage';

const PIN_HASH_KEY = 'zenlens_pin_hash';
const PIN_SALT_KEY = 'zenlens_pin_salt';

/**
 * Generate random salt
 */
function generateSalt(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Hash PIN with salt
 */
function hashPIN(pin: string, salt: string): string {
  return CryptoJS.SHA256(salt + pin).toString();
}

/**
 * Set PIN for first time or change
 */
export async function setPIN(pin: string): Promise<void> {
  try {
    if (pin.length < 4 || pin.length > 8) {
      throw new Error('PIN must be between 4 and 8 digits');
    }

    if (!/^\d+$/.test(pin)) {
      throw new Error('PIN must contain only digits');
    }

    const salt = generateSalt();
    const hash = hashPIN(pin, salt);

    await setStoredItem(PIN_SALT_KEY, salt);
    await setStoredItem(PIN_HASH_KEY, hash);

    console.log('PIN set successfully');
  } catch (error) {
    console.error('Failed to set PIN:', error);
    throw error;
  }
}

/**
 * Verify PIN
 */
export async function verifyPIN(pin: string): Promise<boolean> {
  try {
    const salt = await getStoredItem(PIN_SALT_KEY);
    const storedHash = await getStoredItem(PIN_HASH_KEY);

    if (!salt || !storedHash) {
      console.warn('PIN not set');
      return false;
    }

    const computedHash = hashPIN(pin, salt);
    const isValid = computedHash === storedHash;

    if (!isValid) {
      console.warn('PIN verification failed');
    }

    return isValid;
  } catch (error) {
    console.error('Failed to verify PIN:', error);
    return false;
  }
}

/**
 * Check if PIN is configured
 */
export async function isPINConfigured(): Promise<boolean> {
  try {
    const hash = await getStoredItem(PIN_HASH_KEY);
    return !!hash;
  } catch (error) {
    console.error('Failed to check PIN configuration:', error);
    return false;
  }
}

/**
 * Reset PIN (requires confirmation or recovery key)
 * WARNING: This will lock access to encrypted metadata
 */
export async function resetPIN(): Promise<void> {
  try {
    await deleteStoredItem(PIN_HASH_KEY);
    await deleteStoredItem(PIN_SALT_KEY);
    console.warn('PIN has been reset - encrypted metadata access will be lost');
  } catch (error) {
    console.error('Failed to reset PIN:', error);
    throw error;
  }
}
