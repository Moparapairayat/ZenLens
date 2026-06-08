# ZenLens - Offline AI-Powered Photo Gallery

A production-ready React Native application for offline, local-first photo management with cinematic UI/UX, non-destructive editing, and on-device AI capabilities.

## Features

- 📸 **Masonry Gallery**: Efficient grid display with progressive image loading
- 🎨 **Non-Destructive Editor**: Crop, rotate, adjust exposure/contrast/saturation with operation stacking
- 🔍 **AI-Powered Search**: Natural language queries with embedding-based similarity search
- 📚 **Smart Albums**: Automatic clustering of similar photos (K-Means, DBSCAN)
- 🔒 **App Lock**: PIN + Biometric authentication with secure storage
- 🎬 **Cinematic UI**: Glass cards, neon accents, smooth animations with Reanimated 4
- ⚡ **GPU Rendering**: Real-time filters via Shopify React Native Skia
- 📱 **Offline First**: All features work without internet; cloud is optional
- 🚀 **Performance**: Background indexing, progressive thumbnails, quantized embeddings

## Tech Stack

- **Framework**: Expo SDK 56, React 19, React Native 0.85, TypeScript
- **Navigation**: React Navigation (Stack + Tabs)
- **Animation**: React Native Reanimated 4 + Worklets
- **GPU Rendering**: Shopify React Native Skia
- **Database**: expo-sqlite + MMKV cache
- **Security**: expo-secure-store (SecureStore API)
- **Biometrics**: expo-local-authentication
- **Media Access**: expo-media-library
- **Image Processing**: expo-image, expo-image-manipulator
- **State Management**: Zustand + React Context
- **AI Runtime**: TFLite stubs (requires native implementation)
- **Testing**: Jest, React Native Testing Library

## Project Structure

```
ZenLens/
├── App.tsx                          # Main app entry
├── src/
│   ├── screens/
│   │   ├── GalleryScreen.tsx       # Main photo gallery
│   │   ├── PhotoViewScreen.tsx     # Full-screen photo viewer
│   │   ├── EditorScreen.tsx        # Non-destructive editor
│   │   ├── SearchScreen.tsx        # AI search interface
│   │   └── SmartAlbumsScreen.tsx   # Auto-generated albums
│   ├── components/
│   │   ├── MasonryGrid.tsx         # Multi-column grid
│   │   ├── ProgressiveImage.tsx    # Lazy-load images
│   │   ├── GlassCard.tsx           # Glassmorphic UI
│   │   ├── HoloSearchBar.tsx       # Animated search input
│   │   ├── SkiaFilterPreview.tsx   # GPU filter preview
│   │   ├── BrushMaskEditor.tsx     # Selective editing
│   │   └── ProtectedWrapper.tsx    # App lock screen
│   ├── context/
│   │   ├── ThemeContext.tsx        # Design tokens (Next-Zen)
│   │   ├── AuthContext.tsx         # Lock state management
│   │   └── GalleryContext.tsx      # Media list state
│   ├── navigation/
│   │   └── index.tsx               # Navigation config
│   ├── db/
│   │   ├── init.ts                 # SQLite schema
│   │   └── mediaRepository.ts      # CRUD operations
│   ├── ai/
│   │   ├── embeddingStub.ts        # Image/text embeddings
│   │   ├── captionStub.ts          # Photo captioning
│   │   ├── similarity.ts           # Cosine similarity search
│   │   └── clustering.ts           # K-Means, DBSCAN
│   ├── security/
│   │   ├── pinStore.ts             # PIN auth with SHA256
│   │   ├── biometric.ts            # Biometric enrollment
│   │   └── dbKey.ts                # DB encryption key
│   ├── utils/
│   │   ├── colorExtract.ts         # Dominant color detection
│   │   ├── imageUtils.ts           # Thumbnail caching
│   │   └── backgroundIndexer.ts    # Async metadata extraction
│   ├── styles/
│   │   └── theme.ts                # Theme tokens
│   └── tests/
│       ├── similarity.test.ts       # Search algorithm tests
│       ├── clustering.test.ts       # Clustering tests
│       └── db.test.ts              # Database tests
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.json
├── .prettierrc.json
└── app.json                         # Expo config
```

## Setup & Installation

### Prerequisites

- Node.js 20+
- Expo CLI via `npx expo` or the project npm scripts
- iOS: Xcode 14+ (for iOS build)
- Android: Android Studio (for Android build)

### Managed Workflow (Expo)

1. **Clone and install**:
```bash
cd ZenLens
npm install
```

2. **Start development server**:
```bash
npm run start
```

3. **Run on simulator**:
```bash
# iOS
npm run ios

# Android
npm run android
```

### Native Build Workflow (For TFLite Integration)

If you need native TFLite models:

1. **Generate native projects**:
```bash
npm run prebuild
```

2. **Install native dependencies**:

**iOS**:
```bash
cd ios
pod install
cd ..
```

**Android**: Gradle dependencies auto-handled.

3. **Add native modules** (see TFLite Integration section below).

## Database Schema

### Tables

- **media**: Original photo metadata
  - `id` (TEXT, PK)
  - `uri` (TEXT) - File system path
  - `filename`, `width`, `height`
  - `createdAt`, `modifiedAt`

- **metadata**: AI-generated data
  - `mediaId` (FK to media)
  - `caption` (TEXT) - Photo description
  - `tags` (JSON) - Auto-generated tags
  - `embedding` (TEXT) - JSON-packed 384-dimensional float32
  - `embeddingQuantized` (TEXT) - JSON-packed compressed uint8
  - `dominantColor` (TEXT) - Hex color
  - `colorPalette` (JSON) - Vibrant, muted, etc.

- **edits**: Non-destructive operation stack
  - `mediaId` (FK)
  - `operationIndex` (INT) - Stack order
  - `operationType` (TEXT) - crop, rotate, filter, etc.
  - `params` (JSON) - Operation parameters
  - `exportedUri` (TEXT) - Final flattened image path

- **thumbnails**: Cached small images
  - `mediaId` (FK)
  - `thumbnailUri` (TEXT)
  - `size` (INT) - Bytes

- **albums**: User and smart albums
  - `id` (TEXT, PK)
  - `name` (TEXT)
  - `isSmartAlbum` (INT) - 1 if auto-generated
  - `clusteringParams` (JSON) - Algorithm config

- **searchIndex**: Full-text search index
  - `mediaId` (FK)
  - `indexedText` (TEXT) - Tokenized content

- **indexingStatus**: Background job tracking
  - `mediaId` (FK)
  - `status` (TEXT) - pending, in_progress, completed
  - `progress` (INT) - 0-100%

## API Reference

### Database (`src/db/mediaRepository.ts`)

```typescript
// Add media record
await addMediaRecord({
  uri: 'file:///path/to/photo.jpg',
  filename: 'photo.jpg',
  width: 1000,
  height: 1000,
  createdAt: Date.now(),
  modifiedAt: Date.now()
});

// Get all media with pagination
const items = await getAllMedia(limit: 50, offset: 0);

// Get metadata
const metadata = await getMetadataRecord(mediaId);

// Add edit operation
await addEditOperation({
  mediaId,
  operationType: 'crop',
  params: { x: 0, y: 0, width: 500, height: 500 }
});
```

### AI Functions (`src/ai/`)

```typescript
// Generate image embedding
const embedding = await runImageEmbedding(imageUri);

// Generate text embedding
const queryEmbedding = await runTextEmbedding('mountain sunset');

// Find similar images
const similar = findTopNSimilar(queryEmbedding, candidates, topN: 10);

// Quantize for storage
const quantized = quantizeEmbedding(embedding);
const restored = dequantizeEmbedding(quantized);

// Clustering
const kmeans = kMeansClustering(embeddings, k: 8);
const dbscan = dbscanClustering(embeddings, eps: 0.5, minPoints: 3);
```

### Security (`src/security/`)

```typescript
// PIN management
await setPIN('1234');
const isValid = await verifyPIN('1234');
const isPinSet = await isPINConfigured();

// Biometric
const available = await isBiometricAvailable();
const success = await authenticateWithBiometric();
await enableBiometric();

// Encryption
const encrypted = await encryptMetadata(data, key);
const decrypted = await decryptMetadata(encrypted, key);
```

## TFLite Integration Guide

The app includes stubs for on-device TFLite models. To integrate real models:

### 1. Model Requirements

- **Image Embedding**: MobileNet-based encoder → 384-dim vector
  - Input: 224×224 RGB image
  - Output: Float32Array[384]
  - Example: TensorFlow Lite MobileNetV3 + custom head

- **Text Embedding**: Sentence-Transformer quantized
  - Input: UTF-8 text (max 512 chars)
  - Output: Float32Array[384]
  - Example: All-MiniLM-L6-v2 quantized

- **Captioning**: BLIP or ViT-GPT2 (optional)
  - Input: 224×224 RGB image
  - Output: String

- **Face Detection**: MobileNet-SSD
  - Input: Full image
  - Output: Bounding boxes + face embeddings

### 2. Native Bridge Implementation

#### iOS (Swift)

Create `ios/ZenLens/TFLiteEmbedding.swift`:

```swift
import TensorFlowLite

@objc(TFLiteEmbedding)
class TFLiteEmbedding: NSObject {
  @objc(runImageEmbedding:resolve:reject:)
  func runImageEmbedding(
    imagePath: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    do {
      let image = UIImage(contentsOfFile: imagePath)
      let interpreter = try Interpreter(modelPath: "model.tflite")
      let input = preprocessImage(image!)
      try interpreter.allocateTensors()
      try interpreter.copy(input, toInputAt: 0)
      try interpreter.invoke()
      
      let output = try interpreter.output(at: 0)
      let embedding = [Float](
        UnsafeRawBufferPointer(start: output.data.baseAddress!.assumingMemoryBound(to: Float.self),
                               count: output.shape.reduce(1, *))
      )
      resolve(embedding)
    } catch {
      reject("TFLite", error.localizedDescription, nil)
    }
  }
}
```

Register module in `ios/ZenLens/RCTBridge+TFLite.m`.

#### Android (Kotlin)

Create `android/app/src/main/kotlin/com/zenlens/gallery/TFLiteModule.kt`:

```kotlin
import com.facebook.react.bridge.*
import org.tensorflow.lite.Interpreter
import android.graphics.Bitmap

class TFLiteModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName() = "TFLiteEmbedding"

  @ReactMethod
  fun runImageEmbedding(imagePath: String, promise: Promise) {
    try {
      val tflite = Interpreter(File("model.tflite"))
      val image = BitmapFactory.decodeFile(imagePath)
      val input = preprocessImage(image)
      
      val output = FloatArray(384)
      tflite.run(input, output)
      
      promise.resolve(output.toList())
    } catch (e: Exception) {
      promise.reject("TFLite", e.message)
    }
  }
}
```

Register in `android/app/src/main/kotlin/com/zenlens/gallery/MainApplication.kt`.

### 3. Update Stubs

Replace stubs in `src/ai/embeddingStub.ts`:

```typescript
import { NativeModules } from 'react-native';

export async function runImageEmbedding(imageUri: string): Promise<Float32Array> {
  try {
    const result = await NativeModules.TFLiteEmbedding.runImageEmbedding(imageUri);
    return new Float32Array(result);
  } catch (error) {
    console.warn('TFLite unavailable, using fallback', error);
    return generatePlaceholderEmbedding(imageUri);
  }
}
```

## Testing

Run unit tests:

```bash
npm test
```

Specific test suites:

```bash
npm test -- similarity.test.ts
npm test -- clustering.test.ts
npm test -- db.test.ts
```

Coverage report:

```bash
npm test -- --coverage
```

## Performance Optimization

### Thumbnail Caching

- Thumbnails stored in app cache directory
- LRU eviction when cache > 50MB
- Progressive loading: 200px thumbnail → full image

### Embedding Quantization

- Store quantized uint8 by default (~4x smaller)
- Dequantize on-demand for search
- Reduces SQLite BLOB size from 1.5KB to 384 bytes

### Background Indexing

- Low-priority tasks using MMKV queue
- Batching: 2 concurrent indexing jobs
- Pause/resume via toggle
- Progress tracking in real-time

### GPU Filters

- Skia shader-based rendering
- Real-time preview on main thread
- Heavy export on native thread

## Security Considerations

### Data Protection

- **PIN**: SHA256(salt + pin) stored in SecureStore
- **DB Key**: Random 32-char key in SecureStore
- **Metadata**: AES-256 encryption (optional for SQLCipher)
- **Biometric**: Convenience unlock only, PIN is primary

### Privacy

- No telemetry or analytics
- All processing local (no cloud calls by default)
- Optional cloud features require explicit opt-in
- Clear user warnings for feature limitations

### Recovery

- **Lost PIN**: Database key locked; metadata inaccessible
- **Factory Reset**: Clears all encrypted data
- **Backup**: Export unencrypted photo library only

## Troubleshooting

### "Biometric not available"
- Ensure device has supported authentication (Face ID, Touch ID, fingerprint)
- Check permissions in `app.json` and OS settings

### "Database locked"
- Close other app instances
- Check file permissions on SQLite DB
- Verify MMKV directory writable

### "Image not loading"
- Verify file URI is correct (file:// scheme)
- Check storage permissions granted
- Confirm image format supported (JPEG, PNG, WebP)

### "Embeddings very slow"
- Check if indexing paused: `isIndexingPaused()`
- Verify TFLite model loaded successfully
- Profile with Metro profiler: `npm run start -- --log-level=verbose`

## Contributing

1. Fork repository
2. Create feature branch
3. Follow TypeScript strict mode
4. Write tests for new features
5. Format with Prettier: `npm run format`
6. Lint: `npm run lint`
7. Submit PR

## License

MIT

## Acknowledgments

- Shopify React Native Skia team
- React Navigation community
- TensorFlow Lite contributors
- Expo community

## Future Roadmap

- [ ] Advanced face recognition & people albums
- [ ] Handwritten note OCR
- [ ] Cloud sync (opt-in)
- [ ] Collaborative albums
- [ ] Advanced healing/object removal brush
- [ ] Batch operations
- [ ] Desktop companion app
- [ ] AI-powered auto-curation
- [ ] Custom model training on-device
- [ ] Haptic feedback system

---

**Built with ❤️ for offline-first photography.**
