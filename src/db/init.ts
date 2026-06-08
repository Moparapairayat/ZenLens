/**
 * Database initialization and schema
 * SQLite storage for media, metadata, albums, and edit stacks
 */
import Database from 'react-native-sqlite-storage';
import { Platform } from 'react-native';

// Enable debug for development
Database.DEBUG(true);

const db = Database.openDatabase(
  {
    name: 'zenlens.db',
    location: 'default',
  },
  () => console.log('Database opened successfully'),
  (error) => console.error('Database open failed:', error)
);

/**
 * SQL Schema Definitions
 */
const SCHEMA = {
  // Media library - original photos
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
      albumId TEXT,
      FOREIGN KEY(albumId) REFERENCES albums(id)
    );
    CREATE INDEX idx_media_createdAt ON media(createdAt DESC);
    CREATE INDEX idx_media_albumId ON media(albumId);
  `,

  // Metadata - AI-generated data and user annotations
  metadata: `
    CREATE TABLE IF NOT EXISTS metadata (
      id TEXT PRIMARY KEY,
      mediaId TEXT NOT NULL UNIQUE,
      caption TEXT,
      tags TEXT,
      embedding BLOB,
      embeddingQuantized BLOB,
      dominantColor TEXT,
      faceEmbeddings BLOB,
      colorPalette TEXT,
      exifData TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY(mediaId) REFERENCES media(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_metadata_mediaId ON metadata(mediaId);
  `,

  // Thumbnails - cached small images
  thumbnails: `
    CREATE TABLE IF NOT EXISTS thumbnails (
      id TEXT PRIMARY KEY,
      mediaId TEXT NOT NULL UNIQUE,
      thumbnailUri TEXT NOT NULL,
      size INTEGER,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(mediaId) REFERENCES media(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_thumbnails_mediaId ON thumbnails(mediaId);
  `,

  // Albums - user-created or smart albums
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
    CREATE INDEX idx_albums_isSmartAlbum ON albums(isSmartAlbum);
  `,

  // Edit operations - non-destructive stack
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
    CREATE INDEX idx_edits_mediaId ON edits(mediaId);
    CREATE UNIQUE INDEX idx_edits_mediaId_operationIndex ON edits(mediaId, operationIndex);
  `,

  // Search index - for text-based fallback search
  searchIndex: `
    CREATE TABLE IF NOT EXISTS searchIndex (
      id TEXT PRIMARY KEY,
      mediaId TEXT NOT NULL UNIQUE,
      indexedText TEXT,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY(mediaId) REFERENCES media(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_searchIndex_mediaId ON searchIndex(mediaId);
  `,

  // Indexing status - track background indexing progress
  indexingStatus: `
    CREATE TABLE IF NOT EXISTS indexingStatus (
      id TEXT PRIMARY KEY,
      mediaId TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      progress INTEGER DEFAULT 0,
      lastUpdated INTEGER NOT NULL,
      FOREIGN KEY(mediaId) REFERENCES media(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_indexingStatus_status ON indexingStatus(status);
  `,
};

/**
 * Execute SQL in transaction
 */
function executeSql(sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        sql,
        [],
        () => resolve(),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
}

/**
 * Initialize database schema
 */
export async function initializeDB(): Promise<void> {
  try {
    // Execute all schema creation statements
    for (const [name, sql] of Object.entries(SCHEMA)) {
      try {
        await executeSql(sql);
        console.log(`Schema ${name} initialized`);
      } catch (error) {
        console.error(`Failed to initialize ${name} schema:`, error);
        // Continue with other schemas
      }
    }

    console.log('Database initialization complete');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

/**
 * Get database instance
 */
export function getDatabase(): any {
  return db;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.close(() => {
      console.log('Database closed');
      resolve();
    }, reject);
  });
}
