/**
 * Database initialization and schema.
 * Uses Expo SQLite so the managed workflow works across native targets and web.
 */
import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

type SQLiteValue = string | number | null;

export interface ZenLensDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params?: SQLiteValue[]): Promise<unknown>;
  getFirstAsync<T>(source: string, params?: SQLiteValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, params?: SQLiteValue[]): Promise<T[]>;
  closeAsync(): Promise<void>;
}

interface MemoryMediaRow {
  id: string;
  uri: string;
  filename: string;
  width: number;
  height: number;
  duration: number | null;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: number;
  modifiedAt: number;
  isVideo: number;
  isDeleted: number;
  deletedAt: number | null;
  albumId: string | null;
  thumbnailUri?: string;
}

interface MemoryMetadataRow {
  id: string;
  mediaId: string;
  caption: string | null;
  tags: string | null;
  embedding: string | null;
  embeddingQuantized: string | null;
  dominantColor: string | null;
  colorPalette: string | null;
  exifData: string | null;
  createdAt: number;
  updatedAt: number;
}

interface MemoryThumbnailRow {
  id: string;
  mediaId: string;
  thumbnailUri: string;
  size: number;
  createdAt: number;
}

interface MemoryEditRow {
  id: string;
  mediaId: string;
  operationIndex: number;
  operationType: string;
  params: string;
  isFinal: number;
  exportedUri: string | null;
  createdAt: number;
}

let databasePromise: Promise<ZenLensDatabase> | null = null;

export const SCHEMA = {
  media: `
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      uri TEXT NOT NULL,
      filename TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      duration INTEGER,
      mimeType TEXT,
      fileSize INTEGER,
      createdAt INTEGER NOT NULL,
      modifiedAt INTEGER NOT NULL,
      isVideo INTEGER DEFAULT 0,
      isDeleted INTEGER DEFAULT 0,
      deletedAt INTEGER,
      albumId TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_media_createdAt ON media(createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_media_albumId ON media(albumId);
  `,

  metadata: `
    CREATE TABLE IF NOT EXISTS metadata (
      id TEXT PRIMARY KEY,
      mediaId TEXT NOT NULL UNIQUE,
      caption TEXT,
      tags TEXT,
      embedding TEXT,
      embeddingQuantized TEXT,
      dominantColor TEXT,
      faceEmbeddings TEXT,
      colorPalette TEXT,
      exifData TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY(mediaId) REFERENCES media(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_metadata_mediaId ON metadata(mediaId);
  `,

  thumbnails: `
    CREATE TABLE IF NOT EXISTS thumbnails (
      id TEXT PRIMARY KEY,
      mediaId TEXT NOT NULL UNIQUE,
      thumbnailUri TEXT NOT NULL,
      size INTEGER,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(mediaId) REFERENCES media(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_thumbnails_mediaId ON thumbnails(mediaId);
  `,

  albums: `
    CREATE TABLE IF NOT EXISTS albums (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      coverMediaId TEXT,
      isSmartAlbum INTEGER DEFAULT 0,
      clusteringParams TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_albums_isSmartAlbum ON albums(isSmartAlbum);
  `,

  edits: `
    CREATE TABLE IF NOT EXISTS edits (
      id TEXT PRIMARY KEY,
      mediaId TEXT NOT NULL,
      operationIndex INTEGER NOT NULL,
      operationType TEXT NOT NULL,
      params TEXT NOT NULL,
      isFinal INTEGER DEFAULT 0,
      exportedUri TEXT,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(mediaId) REFERENCES media(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_edits_mediaId ON edits(mediaId);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_edits_mediaId_operationIndex
      ON edits(mediaId, operationIndex);
  `,

  searchIndex: `
    CREATE TABLE IF NOT EXISTS searchIndex (
      id TEXT PRIMARY KEY,
      mediaId TEXT NOT NULL UNIQUE,
      indexedText TEXT,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(mediaId) REFERENCES media(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_searchIndex_mediaId ON searchIndex(mediaId);
  `,

  indexingStatus: `
    CREATE TABLE IF NOT EXISTS indexingStatus (
      id TEXT PRIMARY KEY,
      mediaId TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      lastUpdated INTEGER NOT NULL,
      FOREIGN KEY(mediaId) REFERENCES media(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_indexingStatus_status ON indexingStatus(status);
  `,
};

/**
 * Returns the shared database connection, opening it lazily.
 */
export function getDatabase(): Promise<ZenLensDatabase> {
  if (!databasePromise) {
    databasePromise =
      Platform.OS === 'web' ? Promise.resolve(createMemoryDatabase()) : openNativeDatabase();
  }
  return databasePromise;
}

async function openNativeDatabase(): Promise<ZenLensDatabase> {
  const db: SQLiteDatabase = await SQLite.openDatabaseAsync('zenlens.db');
  return {
    execAsync: (source: string) => db.execAsync(source),
    runAsync: (source: string, params: SQLiteValue[] = []) => db.runAsync(source, params),
    getFirstAsync: <T,>(source: string, params: SQLiteValue[] = []) =>
      db.getFirstAsync<T>(source, params),
    getAllAsync: <T,>(source: string, params: SQLiteValue[] = []) =>
      db.getAllAsync<T>(source, params),
    closeAsync: () => db.closeAsync(),
  };
}

/**
 * Initialize database schema and pragmas.
 */
export async function initializeDB(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync('PRAGMA foreign_keys = ON;');

  for (const [name, sql] of Object.entries(SCHEMA)) {
    try {
      await db.execAsync(sql);
    } catch (error) {
      console.error(`Failed to initialize ${name} schema:`, error);
      throw error;
    }
  }
}

/**
 * Close database connection.
 */
export async function closeDatabase(): Promise<void> {
  if (!databasePromise) {
    return;
  }

  const db = await databasePromise;
  await db.closeAsync();
  databasePromise = null;
}

function createMemoryDatabase(): ZenLensDatabase {
  const media = new Map<string, MemoryMediaRow>();
  const metadata = new Map<string, MemoryMetadataRow>();
  const thumbnails = new Map<string, MemoryThumbnailRow>();
  const edits: MemoryEditRow[] = [];

  return {
    async execAsync(): Promise<void> {
      return undefined;
    },

    async runAsync(source: string, params: SQLiteValue[] = []): Promise<unknown> {
      const normalized = source.replace(/\s+/g, ' ').trim();

      if (normalized.startsWith('INSERT INTO media')) {
        const [
          id,
          uri,
          filename,
          width,
          height,
          duration,
          mimeType,
          fileSize,
          createdAt,
          modifiedAt,
          isVideo,
          albumId,
        ] = params;
        media.set(String(id), {
          id: String(id),
          uri: String(uri),
          filename: String(filename),
          width: Number(width),
          height: Number(height),
          duration: duration == null ? null : Number(duration),
          mimeType: mimeType == null ? null : String(mimeType),
          fileSize: fileSize == null ? null : Number(fileSize),
          createdAt: Number(createdAt),
          modifiedAt: Number(modifiedAt),
          isVideo: Number(isVideo),
          isDeleted: 0,
          deletedAt: null,
          albumId: albumId == null ? null : String(albumId),
        });
      }

      if (normalized.startsWith('INSERT OR REPLACE INTO metadata')) {
        const [
          id,
          mediaId,
          caption,
          tags,
          embedding,
          embeddingQuantized,
          dominantColor,
          colorPalette,
          exifData,
          createdAt,
          updatedAt,
        ] = params;
        metadata.set(String(mediaId), {
          id: String(id),
          mediaId: String(mediaId),
          caption: caption == null ? null : String(caption),
          tags: tags == null ? null : String(tags),
          embedding: embedding == null ? null : String(embedding),
          embeddingQuantized: embeddingQuantized == null ? null : String(embeddingQuantized),
          dominantColor: dominantColor == null ? null : String(dominantColor),
          colorPalette: colorPalette == null ? null : String(colorPalette),
          exifData: exifData == null ? null : String(exifData),
          createdAt: Number(createdAt),
          updatedAt: Number(updatedAt),
        });
      }

      if (normalized.startsWith('INSERT OR REPLACE INTO thumbnails')) {
        const [id, mediaId, thumbnailUri, size, createdAt] = params;
        thumbnails.set(String(mediaId), {
          id: String(id),
          mediaId: String(mediaId),
          thumbnailUri: String(thumbnailUri),
          size: Number(size),
          createdAt: Number(createdAt),
        });
      }

      if (normalized.startsWith('INSERT INTO edits')) {
        const [id, mediaId, operationIndex, operationType, editParams, isFinal, exportedUri, createdAt] =
          params;
        edits.push({
          id: String(id),
          mediaId: String(mediaId),
          operationIndex: Number(operationIndex),
          operationType: String(operationType),
          params: String(editParams),
          isFinal: Number(isFinal),
          exportedUri: exportedUri == null ? null : String(exportedUri),
          createdAt: Number(createdAt),
        });
      }

      if (normalized.startsWith('UPDATE media SET isDeleted')) {
        const [deletedAt, mediaId] = params;
        const row = media.get(String(mediaId));
        if (row) {
          row.isDeleted = 1;
          row.deletedAt = Number(deletedAt);
        }
      }

      return { changes: 1 };
    },

    async getFirstAsync<T>(source: string, params: SQLiteValue[] = []): Promise<T | null> {
      const normalized = source.replace(/\s+/g, ' ').trim();

      if (normalized.includes('FROM media') && normalized.includes('WHERE media.id = ?')) {
        const row = media.get(String(params[0]));
        if (!row || row.isDeleted === 1) {
          return null;
        }
        return { ...row, thumbnailUri: thumbnails.get(row.id)?.thumbnailUri } as T;
      }

      if (normalized.includes('FROM metadata')) {
        return (metadata.get(String(params[0])) as T | undefined) ?? null;
      }

      return null;
    },

    async getAllAsync<T>(source: string, params: SQLiteValue[] = []): Promise<T[]> {
      const normalized = source.replace(/\s+/g, ' ').trim();

      if (normalized.includes('FROM media')) {
        const limit = Number(params[0] ?? 50);
        const offset = Number(params[1] ?? 0);
        return Array.from(media.values())
          .filter((row) => row.isDeleted === 0)
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(offset, offset + limit)
          .map((row) => ({ ...row, thumbnailUri: thumbnails.get(row.id)?.thumbnailUri }) as T);
      }

      if (normalized.includes('FROM edits')) {
        return edits
          .filter((row) => row.mediaId === String(params[0]))
          .sort((a, b) => a.operationIndex - b.operationIndex) as T[];
      }

      return [];
    },

    async closeAsync(): Promise<void> {
      media.clear();
      metadata.clear();
      thumbnails.clear();
      edits.splice(0, edits.length);
    },
  };
}
