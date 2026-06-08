/**
 * Image Utilities
 * Image loading, caching, and manipulation helpers
 */
import * as FileSystem from 'expo-file-system/legacy';
import ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

function getFileSize(info: FileSystem.FileInfo): number {
  return info.exists && 'size' in info && typeof info.size === 'number' ? info.size : 0;
}

function getModificationTime(info: FileSystem.FileInfo): number {
  return info.exists && 'modificationTime' in info && typeof info.modificationTime === 'number'
    ? info.modificationTime
    : 0;
}

/**
 * Generate thumbnail URI from original image
 */
export async function generateThumbnail(
  imageUri: string,
  size: number = 200
): Promise<string | null> {
  try {
    const result = await ImageManipulator.manipulateAsync(imageUri, [{ resize: { width: size, height: size } }], {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    return result.uri;
  } catch (error) {
    console.error('Failed to generate thumbnail:', error);
    return null;
  }
}

/**
 * Get image dimensions
 */
export async function getImageDimensions(
  imageUri: string
): Promise<{ width: number; height: number } | null> {
  try {
    // TODO: Use native module for accurate dimensions
    // For now, return placeholder
    return { width: 1000, height: 1000 };
  } catch (error) {
    console.error('Failed to get image dimensions:', error);
    return null;
  }
}

/**
 * Cache thumbnail to app cache directory
 */
export async function cacheThumbnail(
  imageUri: string,
  mediaId: string,
  size: number = 200
): Promise<string | null> {
  try {
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) return null;

    const thumbnailName = `thumb_${mediaId}_${size}.jpg`;
    const cachedPath = `${cacheDir}${thumbnailName}`;

    // Check if already cached
    const fileInfo = await FileSystem.getInfoAsync(cachedPath);
    if (fileInfo.exists) {
      return cachedPath;
    }

    // Generate and save thumbnail
    const thumbnail = await generateThumbnail(imageUri, size);
    if (!thumbnail) return null;

    // Copy to cache directory
    await FileSystem.copyAsync({
      from: thumbnail,
      to: cachedPath,
    });

    return cachedPath;
  } catch (error) {
    console.error('Failed to cache thumbnail:', error);
    return null;
  }
}

/**
 * Get cached file size
 */
export async function getCacheSize(): Promise<number> {
  try {
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) return 0;

    const files = await FileSystem.readDirectoryAsync(cacheDir);
    let totalSize = 0;

    for (const file of files) {
      const filePath = `${cacheDir}${file}`;
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      totalSize += getFileSize(fileInfo);
    }

    return totalSize;
  } catch (error) {
    console.error('Failed to get cache size:', error);
    return 0;
  }
}

/**
 * Clear old thumbnails if cache exceeds limit
 * LRU eviction policy
 */
export async function clearOldThumbnails(maxCacheSize: number = 50 * 1024 * 1024): Promise<void> {
  try {
    const cacheSize = await getCacheSize();
    if (cacheSize <= maxCacheSize) return;

    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) return;

    const files = await FileSystem.readDirectoryAsync(cacheDir);
    const thumbnailFiles = files
      .filter((f) => f.startsWith('thumb_'))
      .map((f) => ({ name: f, path: `${cacheDir}${f}` }));

    // Sort by modification time (oldest first)
    const filesWithTime = await Promise.all(
      thumbnailFiles.map(async (f) => {
        const info = await FileSystem.getInfoAsync(f.path);
        return { ...f, time: getModificationTime(info) };
      })
    );

    filesWithTime.sort((a, b) => a.time - b.time);

    // Delete oldest files until under limit
    let currentSize = cacheSize;
    for (const file of filesWithTime) {
      if (currentSize <= maxCacheSize) break;

      try {
        const info = await FileSystem.getInfoAsync(file.path);
        await FileSystem.deleteAsync(file.path);
        currentSize -= getFileSize(info);
        console.log(`Deleted cached file: ${file.name}`);
      } catch (error) {
        console.warn(`Failed to delete cached file ${file.name}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to clear old thumbnails:', error);
  }
}

/**
 * Export edited image
 */
export async function exportImage(
  imageUri: string,
  filename: string,
  actions: ImageManipulator.Action[] = []
): Promise<string | null> {
  try {
    const result = await ImageManipulator.manipulateAsync(imageUri, actions, {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    return result.uri;
  } catch (error) {
    console.error('Failed to export image:', error);
    return null;
  }
}

/**
 * Get image EXIF data (stub)
 */
export async function getImageExif(imageUri: string): Promise<Record<string, any> | null> {
  try {
    // TODO: Use react-native-exif or native module
    return null;
  } catch (error) {
    console.error('Failed to get EXIF data:', error);
    return null;
  }
}
