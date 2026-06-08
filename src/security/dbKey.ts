/**
 * Database Encryption Key Management
 * Generates and stores random DB key in SecureStore
 */
import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';

const DB_KEY_STORE_KEY = 'zenlens_db_key';
const DB_KEY_LENGTH = 32;

/**
 * Generate random encryption key
 */
function generateRandomKey(length: number = DB_KEY_LENGTH): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let key = '';
  for (let i = 0; i < length; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

/**
 * Initialize or retrieve database encryption key
 * Creates new key if not exists
 */
export async function initializeSecureStore(): Promise<string> {
  try {
    let key = await SecureStore.getItemAsync(DB_KEY_STORE_KEY);

    if (!key) {
      console.log('Generating new database encryption key');
      key = generateRandomKey();
      await SecureStore.setItemAsync(DB_KEY_STORE_KEY, key);
    }

    return key;
  } catch (error) {
    console.warn('Failed to use SecureStore, falling back to in-memory key:', error);
    // Fallback to in-memory key - NOT production safe
    // In real app, provide clear warning and limited functionality
    return generateRandomKey();
  }
}

/**
 * Get database encryption key
 */
export async function getDBKey(): Promise<string> {
  try {
    const key = await SecureStore.getItemAsync(DB_KEY_STORE_KEY);
    if (!key) {
      throw new Error('Database key not found');
    }
    return key;
  } catch (error) {
    console.error('Failed to retrieve database key:', error);
    throw error;
  }
}

/**
 * Encrypt metadata using AES
 * For use when SQLCipher unavailable
 * @param data - Data to encrypt
 * @param key - Encryption key
 * @returns Base64 encrypted string
 */
export async function encryptMetadata(data: Record<string, any>, key: string): Promise<string> {
  try {
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, key).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
}

/**
 * Decrypt metadata
 * @param encrypted - Encrypted base64 string
 * @param key - Encryption key
 * @returns Decrypted object
 */
export async function decryptMetadata(
  encrypted: string,
  key: string
): Promise<Record<string, any>> {
  try {
    const decrypted = CryptoJS.AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8);
    const data = JSON.parse(decrypted);
    return data;
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
}

/**
 * Generate HMAC for data integrity verification
 */
export function generateHMAC(data: string, key: string): string {
  return CryptoJS.HmacSHA256(data, key).toString();
}

/**
 * Verify HMAC
 */
export function verifyHMAC(data: string, hmac: string, key: string): boolean {
  const computed = generateHMAC(data, key);
  return computed === hmac;
}

/**
 * Reset database key (WARNING: This will lock all encrypted data)
 */
export async function resetDBKey(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(DB_KEY_STORE_KEY);
    console.warn('Database key has been reset - encrypted metadata access will be lost');
  } catch (error) {
    console.error('Failed to reset database key:', error);
    throw error;
  }
}
