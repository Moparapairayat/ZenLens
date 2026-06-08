/**
 * Media Repository
 * CRUD operations for media and metadata with proper type safety
 */
import { getDatabase } from './init';
import v4 from 'react-native-uuid';

export interface MediaRecord {
  id: string;
  uri: string;
  filename: string;
  width: number;
  height: number;
  duration?: number;
  mimeType?: string;
  fileSize?: number;
  createdAt: number;
  modifiedAt: number;
  isVideo?: boolean;
  albumId?: string;
}

export interface MetadataRecord {
  id: string;
  mediaId: string;
  caption?: string;
  tags?: string[];
  embedding?: Float32Array;
  embeddingQuantized?: Uint8Array;
  dominantColor?: string;
  colorPalette?: string[];
  exifData?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface EditOperation {
  id: string;
  mediaId: string;
  operationIndex: number;
  operationType: 'crop' | 'rotate' | 'exposure' | 'contrast' | 'saturation' | 'filter';
  params: Record<string, any>;
  isFinal: boolean;
  exportedUri?: string;
  createdAt: number;
}

/**
 * Add new media record
 */
export async function addMediaRecord(media: Omit<MediaRecord, 'id'>): Promise<string> {
  const id = v4();
  const db = getDatabase();

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        `INSERT INTO media (id, uri, filename, width, height, duration, mimeType, fileSize, createdAt, modifiedAt, isVideo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          media.uri,
          media.filename,
          media.width,
          media.height,
          media.duration || null,
          media.mimeType || null,
          media.fileSize || null,
          media.createdAt,
          media.modifiedAt,
          media.isVideo ? 1 : 0,
        ],
        () => resolve(id),
        (_: any, error: any) => {
          reject(error);
          return false;
        }
      );
    });
  });
}

/**
 * Get media record by ID
 */
export async function getMediaRecord(mediaId: string): Promise<MediaRecord | null> {
  const db = getDatabase();

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        'SELECT * FROM media WHERE id = ? AND isDeleted = 0',
        [mediaId],
        (_: any, result: any) => {
          if (result.rows.length > 0) {
            const row = result.rows.item(0);
            resolve({
              id: row.id,
              uri: row.uri,
              filename: row.filename,
              width: row.width,
              height: row.height,
              duration: row.duration,
              mimeType: row.mimeType,
              fileSize: row.fileSize,
              createdAt: row.createdAt,
              modifiedAt: row.modifiedAt,
              isVideo: row.isVideo === 1,
              albumId: row.albumId,
            });
          } else {
            resolve(null);
          }
        },
        (_: any, error: any) => {
          reject(error);
          return false;
        }
      );
    });
  });
}

/**
 * Get all media records with pagination
 */
export async function getAllMedia(
  limit: number = 50,
  offset: number = 0
): Promise<MediaRecord[]> {
  const db = getDatabase();

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        `SELECT * FROM media WHERE isDeleted = 0 ORDER BY createdAt DESC LIMIT ? OFFSET ?`,
        [limit, offset],
        (_: any, result: any) => {
          const records: MediaRecord[] = [];
          for (let i = 0; i < result.rows.length; i++) {
            const row = result.rows.item(i);
            records.push({
              id: row.id,
              uri: row.uri,
              filename: row.filename,
              width: row.width,
              height: row.height,
              duration: row.duration,
              mimeType: row.mimeType,
              fileSize: row.fileSize,
              createdAt: row.createdAt,
              modifiedAt: row.modifiedAt,
              isVideo: row.isVideo === 1,
              albumId: row.albumId,
            });
          }
          resolve(records);
        },
        (_: any, error: any) => {
          reject(error);
          return false;
        }
      );
    });
  });
}

/**
 * Add metadata record
 */
export async function addMetadataRecord(metadata: Omit<MetadataRecord, 'id'>): Promise<string> {
  const id = v4();
  const db = getDatabase();

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        `INSERT INTO metadata (id, mediaId, caption, tags, embedding, embeddingQuantized, dominantColor, colorPalette, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          metadata.mediaId,
          metadata.caption || null,
          metadata.tags ? JSON.stringify(metadata.tags) : null,
          metadata.embedding || null,
          metadata.embeddingQuantized || null,
          metadata.dominantColor || null,
          metadata.colorPalette ? JSON.stringify(metadata.colorPalette) : null,
          metadata.createdAt,
          metadata.updatedAt,
        ],
        () => resolve(id),
        (_: any, error: any) => {
          reject(error);
          return false;
        }
      );
    });
  });
}

/**
 * Get metadata for media
 */
export async function getMetadataRecord(mediaId: string): Promise<MetadataRecord | null> {
  const db = getDatabase();

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        'SELECT * FROM metadata WHERE mediaId = ?',
        [mediaId],
        (_: any, result: any) => {
          if (result.rows.length > 0) {
            const row = result.rows.item(0);
            resolve({
              id: row.id,
              mediaId: row.mediaId,
              caption: row.caption,
              tags: row.tags ? JSON.parse(row.tags) : undefined,
              embedding: row.embedding,
              embeddingQuantized: row.embeddingQuantized,
              dominantColor: row.dominantColor,
              colorPalette: row.colorPalette ? JSON.parse(row.colorPalette) : undefined,
              exifData: row.exifData ? JSON.parse(row.exifData) : undefined,
              createdAt: row.createdAt,
              updatedAt: row.updatedAt,
            });
          } else {
            resolve(null);
          }
        },
        (_: any, error: any) => {
          reject(error);
          return false;
        }
      );
    });
  });
}

/**
 * Add edit operation
 */
export async function addEditOperation(edit: Omit<EditOperation, 'id'>): Promise<string> {
  const id = v4();
  const db = getDatabase();

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        `INSERT INTO edits (id, mediaId, operationIndex, operationType, params, isFinal, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          edit.mediaId,
          edit.operationIndex,
          edit.operationType,
          JSON.stringify(edit.params),
          edit.isFinal ? 1 : 0,
          edit.createdAt,
        ],
        () => resolve(id),
        (_: any, error: any) => {
          reject(error);
          return false;
        }
      );
    });
  });
}

/**
 * Get edit stack for media
 */
export async function getEditStack(mediaId: string): Promise<EditOperation[]> {
  const db = getDatabase();

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        `SELECT * FROM edits WHERE mediaId = ? ORDER BY operationIndex ASC`,
        [mediaId],
        (_: any, result: any) => {
          const operations: EditOperation[] = [];
          for (let i = 0; i < result.rows.length; i++) {
            const row = result.rows.item(i);
            operations.push({
              id: row.id,
              mediaId: row.mediaId,
              operationIndex: row.operationIndex,
              operationType: row.operationType,
              params: JSON.parse(row.params),
              isFinal: row.isFinal === 1,
              exportedUri: row.exportedUri,
              createdAt: row.createdAt,
            });
          }
          resolve(operations);
        },
        (_: any, error: any) => {
          reject(error);
          return false;
        }
      );
    });
  });
}

/**
 * Soft delete media
 */
export async function deleteMedia(mediaId: string): Promise<void> {
  const db = getDatabase();

  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        `UPDATE media SET isDeleted = 1, deletedAt = ? WHERE id = ?`,
        [Date.now(), mediaId],
        () => resolve(),
        (_: any, error: any) => {
          reject(error);
          return false;
        }
      );
    });
  });
}
