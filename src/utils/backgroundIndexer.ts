/**
 * Background Indexing Service
 * Processes photos: thumbnails, color extraction, embeddings, captions
 * Runs with low priority using background task APIs
 */
import { createMMKV } from 'react-native-mmkv';
import { runImageEmbedding, quantizeEmbedding } from '../ai/embeddingStub';
import { runCaptionModel } from '../ai/captionStub';
import { getFallbackTags } from '../ai/captionStub';
import { extractDominantColor } from './colorExtract';
import { cacheThumbnail } from './imageUtils';
import { addMetadataRecord, getMediaRecord, upsertThumbnail } from '../db/mediaRepository';

/**
 * Indexing status tracking
 */
export enum IndexingStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

interface IndexingTask {
  mediaId: string;
  status: IndexingStatus;
  progress: number;
  lastUpdated: number;
}

const indexingStore = createMMKV({ id: 'zenlens-indexing' });
const INDEXING_PREFIX = 'indexing_';
const INDEXING_PAUSE_KEY = 'indexing_paused';

/**
 * Get indexing status for media
 */
export function getIndexingStatus(mediaId: string): IndexingTask | null {
  try {
    const key = `${INDEXING_PREFIX}${mediaId}`;
    const data = indexingStore.getString(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Failed to get indexing status:', error);
    return null;
  }
}

/**
 * Update indexing status
 */
function setIndexingStatus(mediaId: string, status: IndexingTask): void {
  try {
    const key = `${INDEXING_PREFIX}${mediaId}`;
    indexingStore.set(key, JSON.stringify(status));
  } catch (error) {
    console.error('Failed to set indexing status:', error);
  }
}

/**
 * Check if indexing is paused
 */
export function isIndexingPaused(): boolean {
  try {
    return indexingStore.getBoolean(INDEXING_PAUSE_KEY) || false;
  } catch (error) {
    console.error('Failed to check indexing pause status:', error);
    return false;
  }
}

/**
 * Pause background indexing
 */
export function pauseIndexing(): void {
  try {
    indexingStore.set(INDEXING_PAUSE_KEY, true);
    console.log('Background indexing paused');
  } catch (error) {
    console.error('Failed to pause indexing:', error);
  }
}

/**
 * Resume background indexing
 */
export function resumeIndexing(): void {
  try {
    indexingStore.set(INDEXING_PAUSE_KEY, false);
    console.log('Background indexing resumed');
  } catch (error) {
    console.error('Failed to resume indexing:', error);
  }
}

/**
 * Index single media item
 * Performs all metadata extraction and AI inference
 */
export async function indexMedia(mediaId: string): Promise<boolean> {
  try {
    if (isIndexingPaused()) {
      console.log(`Indexing paused, skipping ${mediaId}`);
      return false;
    }

    // Check current status
    const currentStatus = getIndexingStatus(mediaId);
    if (currentStatus?.status === IndexingStatus.COMPLETED) {
      console.log(`Already indexed: ${mediaId}`);
      return true;
    }

    // Get media record
    const media = await getMediaRecord(mediaId);
    if (!media) {
      console.warn(`Media not found: ${mediaId}`);
      return false;
    }

    // Update status to in progress
    setIndexingStatus(mediaId, {
      mediaId,
      status: IndexingStatus.IN_PROGRESS,
      progress: 0,
      lastUpdated: Date.now(),
    });

    try {
      // Step 1: Generate thumbnail
      console.log(`[Index] Generating thumbnail for ${mediaId}`);
      const thumbnailUri = await cacheThumbnail(media.uri, mediaId, 200);
      if (thumbnailUri) {
        await upsertThumbnail(mediaId, thumbnailUri, 200);
      }
      setIndexingStatus(mediaId, {
        mediaId,
        status: IndexingStatus.IN_PROGRESS,
        progress: 20,
        lastUpdated: Date.now(),
      });

      // Step 2: Extract dominant color
      console.log(`[Index] Extracting color for ${mediaId}`);
      const dominantColor = await extractDominantColor(media.uri);
      setIndexingStatus(mediaId, {
        mediaId,
        status: IndexingStatus.IN_PROGRESS,
        progress: 40,
        lastUpdated: Date.now(),
      });

      // Step 3: Generate embedding
      console.log(`[Index] Generating embedding for ${mediaId}`);
      const embedding = await runImageEmbedding(media.uri);
      const embeddingQuantized = quantizeEmbedding(embedding);
      setIndexingStatus(mediaId, {
        mediaId,
        status: IndexingStatus.IN_PROGRESS,
        progress: 60,
        lastUpdated: Date.now(),
      });

      // Step 4: Generate caption
      console.log(`[Index] Generating caption for ${mediaId}`);
      const caption = await runCaptionModel(media.uri);
      setIndexingStatus(mediaId, {
        mediaId,
        status: IndexingStatus.IN_PROGRESS,
        progress: 80,
        lastUpdated: Date.now(),
      });

      // Step 5: Generate fallback tags
      const tags = getFallbackTags(media.uri, media.filename);

      // Step 6: Save metadata
      console.log(`[Index] Saving metadata for ${mediaId}`);
      await addMetadataRecord({
        mediaId,
        caption,
        tags,
        embedding,
        embeddingQuantized,
        dominantColor,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Update status to completed
      setIndexingStatus(mediaId, {
        mediaId,
        status: IndexingStatus.COMPLETED,
        progress: 100,
        lastUpdated: Date.now(),
      });

      console.log(`[Index] Completed: ${mediaId}`);
      return true;
    } catch (error) {
      console.error(`[Index] Failed for ${mediaId}:`, error);
      setIndexingStatus(mediaId, {
        mediaId,
        status: IndexingStatus.FAILED,
        progress: 0,
        lastUpdated: Date.now(),
      });
      return false;
    }
  } catch (error) {
    console.error('indexMedia error:', error);
    return false;
  }
}

/**
 * Batch index multiple media items
 */
export async function batchIndexMedia(mediaIds: string[], concurrency: number = 2): Promise<number> {
  let completed = 0;

  for (let i = 0; i < mediaIds.length; i += concurrency) {
    const batch = mediaIds.slice(i, i + concurrency);
    const results = await Promise.all(batch.map((id) => indexMedia(id)));
    completed += results.filter(Boolean).length;
  }

  return completed;
}

/**
 * Get indexing progress
 */
export function getIndexingProgress(): { total: number; completed: number; failed: number } {
  try {
    let total = 0;
    let completed = 0;
    let failed = 0;

    const keys = indexingStore.getAllKeys();
    for (const key of keys) {
      if (key.startsWith(INDEXING_PREFIX)) {
        const data = indexingStore.getString(key);
        if (data) {
          const task = JSON.parse(data) as IndexingTask;
          total++;
          if (task.status === IndexingStatus.COMPLETED) completed++;
          if (task.status === IndexingStatus.FAILED) failed++;
        }
      }
    }

    return { total, completed, failed };
  } catch (error) {
    console.error('Failed to get indexing progress:', error);
    return { total: 0, completed: 0, failed: 0 };
  }
}

/**
 * Clear all indexing status cache
 */
export function clearIndexingStatus(): void {
  try {
    indexingStore.getAllKeys().forEach((key: string) => {
      if (key.startsWith(INDEXING_PREFIX)) {
        indexingStore.remove(key);
      }
    });
    console.log('Cleared indexing status cache');
  } catch (error) {
    console.error('Failed to clear indexing status:', error);
  }
}
