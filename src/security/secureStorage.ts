/**
 * Cross-platform secure storage wrapper.
 * Native uses Expo SecureStore; web falls back to localStorage/in-memory storage.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const memoryStore = new Map<string, string>();

function getWebStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export async function getStoredItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return getWebStorage()?.getItem(key) ?? memoryStore.get(key) ?? null;
  }

  return SecureStore.getItemAsync(key);
}

export async function setStoredItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    const storage = getWebStorage();
    if (storage) {
      storage.setItem(key, value);
    } else {
      memoryStore.set(key, value);
    }
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export async function deleteStoredItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    getWebStorage()?.removeItem(key);
    memoryStore.delete(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}
