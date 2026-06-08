/**
 * Media repository.
 * CRUD operations for local media, AI metadata, thumbnails, and edit stacks.
 */
import uuid from 'react-native-uuid';
import { getDatabase } from './init';

type JsonValue = Record<string, unknown>;

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
  thumbnailUri?: string;
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
  exifData?: JsonValue;
  createdAt: number;
  updatedAt: number;
}

export interface EditOperation {
  id: string;
  mediaId: string;
  operationIndex: number;
  operationType: 'crop' | 'rotate' | 'exposure' | 'contrast' | 'saturation' | 'filter' | 'export';
  params: JsonValue;
  isFinal: boolean;
  exportedUri?: string;
  createdAt: number;
}

interface MediaRow extends Omit<MediaRecord, 'isVideo'> {
  isVideo: number;
}

interface MetadataRow {
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

interface EditRow extends Omit<EditOperation, 'params' | 'isFinal'> {
  params: string;
  isFinal: number;
}

function createId(): string {
  return String(uuid.v4());
}

function encodeNumberArray(value?: Float32Array | Uint8Array): string | null {
  return value ? JSON.stringify(Array.from(value)) : null;
}

function decodeFloat32(value?: string | null): Float32Array | undefined {
  return value ? new Float32Array(JSON.parse(value) as number[]) : undefined;
}

function decodeUint8(value?: string | null): Uint8Array | undefined {
  return value ? new Uint8Array(JSON.parse(value) as number[]) : undefined;
}

function parseJson<T>(value?: string | null): T | undefined {
  return value ? (JSON.parse(value) as T) : undefined;
}

function mapMediaRow(row: MediaRow): MediaRecord {
  return {
    ...row,
    isVideo: row.isVideo === 1,
  };
}

/**
 * Add new media record.
 */
export async function addMediaRecord(media: Omit<MediaRecord, 'id'>): Promise<string> {
  const id = createId();
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO media
      (id, uri, filename, width, height, duration, mimeType, fileSize, createdAt, modifiedAt, isVideo, albumId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      media.uri,
      media.filename,
      media.width,
      media.height,
      media.duration ?? null,
      media.mimeType ?? null,
      media.fileSize ?? null,
      media.createdAt,
      media.modifiedAt,
      media.isVideo ? 1 : 0,
      media.albumId ?? null,
    ]
  );

  return id;
}

/**
 * Get media record by ID.
 */
export async function getMediaRecord(mediaId: string): Promise<MediaRecord | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<MediaRow>(
    `SELECT media.*, thumbnails.thumbnailUri
     FROM media
     LEFT JOIN thumbnails ON thumbnails.mediaId = media.id
     WHERE media.id = ? AND media.isDeleted = 0`,
    [mediaId]
  );

  return row ? mapMediaRow(row) : null;
}

/**
 * Get all media records with pagination.
 */
export async function getAllMedia(limit = 50, offset = 0): Promise<MediaRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<MediaRow>(
    `SELECT media.*, thumbnails.thumbnailUri
     FROM media
     LEFT JOIN thumbnails ON thumbnails.mediaId = media.id
     WHERE media.isDeleted = 0
     ORDER BY media.createdAt DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  return rows.map(mapMediaRow);
}

/**
 * Add or replace metadata record.
 */
export async function addMetadataRecord(metadata: Omit<MetadataRecord, 'id'>): Promise<string> {
  const id = createId();
  const db = await getDatabase();

  await db.runAsync(
    `INSERT OR REPLACE INTO metadata
      (id, mediaId, caption, tags, embedding, embeddingQuantized, dominantColor, colorPalette, exifData, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      metadata.mediaId,
      metadata.caption ?? null,
      metadata.tags ? JSON.stringify(metadata.tags) : null,
      encodeNumberArray(metadata.embedding),
      encodeNumberArray(metadata.embeddingQuantized),
      metadata.dominantColor ?? null,
      metadata.colorPalette ? JSON.stringify(metadata.colorPalette) : null,
      metadata.exifData ? JSON.stringify(metadata.exifData) : null,
      metadata.createdAt,
      metadata.updatedAt,
    ]
  );

  return id;
}

/**
 * Get metadata for media.
 */
export async function getMetadataRecord(mediaId: string): Promise<MetadataRecord | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<MetadataRow>('SELECT * FROM metadata WHERE mediaId = ?', [
    mediaId,
  ]);

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    mediaId: row.mediaId,
    caption: row.caption ?? undefined,
    tags: parseJson<string[]>(row.tags),
    embedding: decodeFloat32(row.embedding),
    embeddingQuantized: decodeUint8(row.embeddingQuantized),
    dominantColor: row.dominantColor ?? undefined,
    colorPalette: parseJson<string[]>(row.colorPalette),
    exifData: parseJson<JsonValue>(row.exifData),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Add or replace cached thumbnail metadata.
 */
export async function upsertThumbnail(
  mediaId: string,
  thumbnailUri: string,
  size: number
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO thumbnails (id, mediaId, thumbnailUri, size, createdAt)
     VALUES (?, ?, ?, ?, ?)`,
    [createId(), mediaId, thumbnailUri, size, Date.now()]
  );
}

/**
 * Add edit operation.
 */
export async function addEditOperation(edit: Omit<EditOperation, 'id'>): Promise<string> {
  const id = createId();
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO edits
      (id, mediaId, operationIndex, operationType, params, isFinal, exportedUri, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      edit.mediaId,
      edit.operationIndex,
      edit.operationType,
      JSON.stringify(edit.params),
      edit.isFinal ? 1 : 0,
      edit.exportedUri ?? null,
      edit.createdAt,
    ]
  );

  return id;
}

/**
 * Get edit stack for media.
 */
export async function getEditStack(mediaId: string): Promise<EditOperation[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<EditRow>(
    'SELECT * FROM edits WHERE mediaId = ? ORDER BY operationIndex ASC',
    [mediaId]
  );

  return rows.map((row) => ({
    ...row,
    params: parseJson<JsonValue>(row.params) ?? {},
    isFinal: row.isFinal === 1,
  }));
}

/**
 * Soft delete media.
 */
export async function deleteMedia(mediaId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE media SET isDeleted = 1, deletedAt = ? WHERE id = ?', [
    Date.now(),
    mediaId,
  ]);
}
