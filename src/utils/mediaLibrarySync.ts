/**
 * Syncs device media-library assets into the local ZenLens database.
 */
import { Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library/legacy';
import { upsertMediaRecord } from '../db/mediaRepository';

export interface MediaLibrarySyncResult {
  status: 'synced' | 'permission-denied' | 'unavailable' | 'error';
  imported: number;
  total: number;
  message: string;
}

interface SyncOptions {
  limit?: number;
}

const DEFAULT_SYNC_LIMIT = 500;

export async function syncDeviceMediaLibrary({
  limit = DEFAULT_SYNC_LIMIT,
}: SyncOptions = {}): Promise<MediaLibrarySyncResult> {
  if (Platform.OS === 'web') {
    return {
      status: 'unavailable',
      imported: 0,
      total: 0,
      message: 'Native media library is not available on web preview.',
    };
  }

  try {
    const isAvailable = await MediaLibrary.isAvailableAsync();
    if (!isAvailable) {
      return {
        status: 'unavailable',
        imported: 0,
        total: 0,
        message: 'Media library is not available on this device.',
      };
    }

    let permission = await MediaLibrary.getPermissionsAsync(false, ['photo']);
    if (!permission.granted || permission.accessPrivileges === 'none') {
      permission = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
    }

    if (!permission.granted || permission.accessPrivileges === 'none') {
      return {
        status: 'permission-denied',
        imported: 0,
        total: 0,
        message: 'Photo permission was not granted.',
      };
    }

    const page = await MediaLibrary.getAssetsAsync({
      first: limit,
      mediaType: MediaLibrary.MediaType.photo,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      resolveWithFullInfo: false,
    });

    await Promise.all(
      page.assets.map((asset) =>
        upsertMediaRecord({
          id: asset.id,
          uri: asset.uri,
          filename: asset.filename || asset.id,
          width: asset.width || 1,
          height: asset.height || 1,
          duration: asset.duration || undefined,
          mimeType: 'image/*',
          createdAt: asset.creationTime || Date.now(),
          modifiedAt: asset.modificationTime || asset.creationTime || Date.now(),
          isVideo: false,
          albumId: asset.albumId,
        })
      )
    );

    return {
      status: 'synced',
      imported: page.assets.length,
      total: page.totalCount,
      message:
        page.assets.length === 0
          ? 'No photos were returned by the device media library.'
          : `Imported ${page.assets.length} of ${page.totalCount} photos.`,
    };
  } catch (error) {
    console.error('Media library sync failed:', error);
    return {
      status: 'error',
      imported: 0,
      total: 0,
      message: error instanceof Error ? error.message : 'Media library sync failed.',
    };
  }
}
