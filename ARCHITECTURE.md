# ZenLens Architecture Document

## System Overview

ZenLens is an offline-first, AI-powered photo gallery built with React Native. The architecture follows a layered approach with clear separation of concerns.

```
┌─────────────────────────────────────────────────────────┐
│                   UI Layer (React)                      │
│  Screens, Components, Navigation, Animations            │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────┐
│              Context & State Management                  │
│  Theme, Auth, Gallery, AppState (Zustand/Context)       │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────┐
│            Business Logic Layer                          │
│  AI, Security, Image Utils, Background Indexer          │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────┐
│             Data Access Layer                            │
│  MediaRepository, Database, Cache (SQLite + MMKV)       │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────────────┐
│          Native Bridge & System                          │
│  TFLite, SecureStore, FileSystem, Camera                │
└─────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. UI Layer

**Screens** (`src/screens/`)
- `GalleryScreen`: Main feed with masonry grid
- `PhotoViewScreen`: Full-screen viewer with metadata
- `EditorScreen`: Non-destructive editing interface
- `SearchScreen`: Natural language search UI
- `SmartAlbumsScreen`: Auto-clustered albums

**Components** (`src/components/`)
- `MasonryGrid`: Multi-column efficient grid
- `ProgressiveImage`: Lazy-load with blur-up
- `GlassCard`: Glassmorphic UI element
- `HoloSearchBar`: Animated search input
- `SkiaFilterPreview`: Real-time GPU filters
- `BrushMaskEditor`: Touch-based mask painting
- `ProtectedWrapper`: App lock overlay

### 2. Context & State Management

**Theme Context** (`ThemeContext.tsx`)
- Provides design tokens (Next-Zen aesthetic)
- Colors, typography, spacing, border-radius
- Supports light/dark mode

**Auth Context** (`AuthContext.tsx`)
- Manages app lock state
- PIN configured status
- Biometric enrollment status
- Activity tracking for inactivity lock

**Gallery Context** (`GalleryContext.tsx`)
- Media items list
- Selection state
- Loading/error states

### 3. Business Logic Layer

**AI Module** (`src/ai/`)
- `embeddingStub.ts`: Image/text embeddings with quantization
- `captionStub.ts`: Photo captioning & face detection
- `similarity.ts`: Cosine similarity search & top-N
- `clustering.ts`: K-Means & DBSCAN for smart albums

**Security Module** (`src/security/`)
- `pinStore.ts`: PIN auth with SHA256 hashing
- `biometric.ts`: Biometric enrollment & verification
- `dbKey.ts`: DB encryption key management & AES encryption

**Utilities** (`src/utils/`)
- `colorExtract.ts`: Dominant color extraction
- `imageUtils.ts`: Thumbnail generation & caching
- `backgroundIndexer.ts`: Async metadata extraction

### 4. Data Access Layer

**Database** (`src/db/`)
- `init.ts`: SQLite schema with 8 tables
- `mediaRepository.ts`: CRUD operations with type safety

**Schema**
- `media`: Original photos
- `metadata`: AI-generated (caption, tags, embeddings)
- `edits`: Non-destructive operation stack
- `thumbnails`: Cached small images
- `albums`: User & smart albums
- `searchIndex`: Full-text search index
- `indexingStatus`: Background job tracking
- `imageExif`: (Future) EXIF metadata

**Caching**
- MMKV for fast key-value cache
- Thumbnail LRU eviction
- Embedding quantization storage

### 5. Native Bridge

**TFLite Integration**
- Image embedding: 384-dim MobileNet-based encoder
- Text embedding: Sentence-Transformer quantized
- Captioning: BLIP or ViT-GPT2 (optional)
- Face detection: MobileNet-SSD

**SecureStore Integration**
- PIN hash storage (expo-secure-store)
- DB encryption key generation
- Biometric enrollment metadata

**File System**
- Media library access (expo-media-library)
- Thumbnail caching (FileSystem API)
- Export paths

## Data Flow

### 1. Gallery Loading

```
App.tsx
  ↓
initializeDB() → SQLite tables created
  ↓
GalleryScreen mounts
  ↓
getAllMedia(limit, offset)
  ↓
Render MasonryGrid with ProgressiveImage
  ↓
Trigger background indexing for new items
  ↓
(Async) Extract embeddings, captions, colors
  ↓
Store in metadata table
```

### 2. Photo Search

```
SearchScreen input
  ↓
Debounce 500ms
  ↓
runTextEmbedding(query) [TFLite or stub]
  ↓
Get all metadata embeddings
  ↓
Dequantize (if stored as uint8)
  ↓
findTopNSimilar(queryEmbedding, candidates, 20)
  ↓
Sort by cosine similarity score
  ↓
Display results with similarity %
```

### 3. Photo Editing

```
EditorScreen opens
  ↓
Load original image URI
  ↓
Load edit stack from database
  ↓
User adjusts sliders → addAdjustment()
  ↓
Real-time preview with Skia filters
  ↓
User clicks Export
  ↓
exportImage() applies all operations
  ↓
Save to documents directory
  ↓
Record export operation in edits table
```

### 4. Smart Album Generation

```
SmartAlbumsScreen mounts
  ↓
Get all media + embeddings
  ↓
Select clustering method (K-Means or DBSCAN)
  ↓
Cluster embeddings
  ↓
Create album records in albums table
  ↓
Display albums with cover photo
```

### 5. App Lock

```
App enters background
  ↓
Start inactivity timer (5 min)
  ↓
App comes to foreground after timeout
  ↓
ProtectedWrapper shows lock screen
  ↓
User enters PIN or uses biometric
  ↓
verifyPIN() or authenticateWithBiometric()
  ↓
Unlock and show gallery
```

## Database Schema Details

### media table

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| uri | TEXT | file:// scheme path |
| filename | TEXT | Original filename |
| width | INT | Image width |
| height | INT | Image height |
| duration | INT | For videos (ms) |
| mimeType | TEXT | image/jpeg, etc |
| createdAt | INT | Unix timestamp |
| modifiedAt | INT | Unix timestamp |
| isDeleted | INT | Soft delete flag |
| albumId | TEXT FK | Foreign key |

### metadata table

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| mediaId | TEXT FK | Unique constraint |
| caption | TEXT | AI-generated description |
| tags | TEXT (JSON) | Array of strings |
| embedding | BLOB | 384×4 bytes (float32) |
| embeddingQuantized | BLOB | 384 bytes (uint8) |
| dominantColor | TEXT | Hex color |
| colorPalette | TEXT (JSON) | Vibrant, muted, etc |
| faceEmbeddings | BLOB | Face detection results |
| exifData | TEXT (JSON) | Camera metadata |

### edits table

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| mediaId | TEXT FK | Foreign key |
| operationIndex | INT | Stack order |
| operationType | TEXT | crop, rotate, filter, etc |
| params | TEXT (JSON) | Operation-specific data |
| isFinal | INT | Marks export |
| exportedUri | TEXT | Flattened image path |

### indexingStatus table

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| mediaId | TEXT FK | Unique constraint |
| status | TEXT | pending, in_progress, completed, failed |
| progress | INT | 0-100% |
| lastUpdated | INT | Unix timestamp |

## Performance Characteristics

### Thumbnail Loading

- **Progressive**: Load 200px thumbnail while fetching full
- **Cache**: LRU eviction at 50MB limit
- **Concurrency**: 2-4 concurrent downloads
- **Format**: JPEG 70% quality

### Embedding Search

- **Query latency**: 100-500ms (including network if TFLite unavailable)
- **Similarity computation**: O(n × 384) for n images
- **Storage**: ~384 bytes quantized per image
- **Top-10 search**: <200ms for 1000 images

### Indexing Background

- **Concurrency**: 2 tasks simultaneously
- **Per-image time**: 5-10 seconds (embedding + caption)
- **Pause/resume**: User can toggle via UI
- **Estimated throughput**: ~360 images/hour

### Memory Usage

- **App baseline**: ~60-80 MB
- **Gallery with 1000 photos**: +100-150 MB
- **Active editor**: +50-100 MB (image buffers)
- **Search with embeddings in memory**: +5-10 MB (384 images)

## Security Model

### Threat Model

**In Scope**:
- Unauthorized app access (PIN/biometric)
- Local file system access
- Network interception (with HTTPS)
- Metadata privacy

**Out of Scope**:
- Physical device tampering
- Rooted/jailbroken OS exploits
- Cloud infrastructure (offline-first only)

### Security Guarantees

1. **PIN Protection**
   - SHA256(salt + pin) hashed
   - Random 32-byte salt per PIN
   - Stored in SecureStore (iOS Keychain, Android Keystore)
   - 10,000 iterations SHA256 (slow hash)

2. **Biometric**
   - Convenience unlock only
   - Delegates to OS biometric engine
   - Cannot directly access encrypted data

3. **DB Encryption** (optional)
   - AES-256 key in SecureStore
   - Encrypt sensitive metadata
   - SQLCipher alternative if available

4. **Secure Storage**
   - All secrets in native secure storage
   - Never hardcoded or in Redux
   - Clear on factory reset

### Privacy Policy

- ✅ Photos stored locally only (encrypted on-device)
- ✅ No telemetry or analytics
- ✅ No cloud sync (unless explicitly enabled)
- ✅ Metadata stored locally
- ✅ No third-party APIs by default

## Extensibility Points

### Adding New AI Models

1. Add stub function in `src/ai/`
2. Register native bridge in iOS/Android
3. Update TFLite fallback behavior
4. Test with deterministic placeholder

### Custom Filters

1. Implement Skia shader in `SkiaFilterPreview.tsx`
2. Add to filter presets array
3. Apply parameters via editor adjustments
4. Export via ImageManipulator

### Smart Album Algorithms

1. Implement clustering in `src/ai/clustering.ts`
2. Add UI toggle in `SmartAlbumsScreen`
3. Expose params in albums table
4. Add to generation pipeline

### Custom Metadata

1. Extend metadata table schema
2. Add extraction in `backgroundIndexer.ts`
3. Display in `PhotoViewScreen` metadata panel
4. Make searchable if needed

## Testing Strategy

### Unit Tests

- Similarity algorithms (cosine, euclidean)
- Clustering (K-Means, DBSCAN)
- Database CRUD operations
- PIN hashing

### Integration Tests

- Gallery load → indexing → search
- Edit operation → export flow
- Authentication → lock/unlock cycle

### E2E Tests (Detox)

- Launch app → gallery visible
- Navigate to photo → metadata loads
- Apply editor filter → export
- Search → results displayed

### Performance Tests

- Masonry scroll @ 60 fps
- Gallery load time < 2 seconds
- Search query < 500ms
- Indexing throughput

## Future Enhancements

1. **Collaborative Albums**: Cloud sync with conflict resolution
2. **Advanced Editing**: Healing brush, object removal
3. **Face Recognition**: People albums with clustering
4. **Offline Search**: Full-text index for tags/captions
5. **Plugin System**: User-defined filters & metadata
6. **Multi-Device**: Cross-device sync
7. **AI Training**: Fine-tune on-device models
8. **AR Features**: Augmented reality photo overlays

---

**Last Updated**: 2024
**Maintainer**: ZenLens Team
