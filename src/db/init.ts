/**
 * Database initialization and schema.
 * Uses Expo SQLite so the managed workflow works across native targets and web.
 */
import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

let databasePromise: Promise<SQLiteDatabase> | null = null;

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
export function getDatabase(): Promise<SQLiteDatabase> {
  databasePromise ??= SQLite.openDatabaseAsync('zenlens.db');
  return databasePromise;
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
