# ZenLens Quick Start Guide

Get ZenLens running in 5 minutes.

## 1. Install Dependencies

```bash
# Clone the project
cd ZenLens

# Install npm packages
npm install

# iOS only: Install pod dependencies
cd ios
pod install
cd ..
```

## 2. Start Development Server

```bash
npm run start
```

Choose platform:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Press `w` for web (limited support)

## 3. Access the App

### First Launch

- App initializes database automatically
- Background indexing starts (can be paused)
- Tap "Gallery" tab to see device photos

### Without PIN Setup

- On first launch, no lock screen
- Set PIN: Settings → Security (future feature)
- Enable biometric: Settings → Biometric (future feature)

## 4. Test Features

### Gallery

1. Tap any photo to view full-size
2. Tap "Edit" to enter editor
3. Tap "Info" to see metadata (caption, tags, color)

### Search

1. Go to "Search" tab
2. Type query: "sunset", "mountain", "food"
3. Results show similarity score %

### Smart Albums

1. Go to "Albums" tab
2. Choose algorithm: K-Means or DBSCAN
3. Scroll to see auto-clustered albums
4. Tap to view album photos

### Editor

1. In PhotoView, tap "Edit"
2. Select filter or adjust exposure/contrast/saturation
3. Tap "Export" to save edited copy
4. Original remains unchanged (non-destructive)

## 5. Debug & Development

### Enable Debug Logs

```typescript
// In App.tsx
import { LogBox } from 'react-native';
LogBox.ignoreAllLogs(); // Disable for debugging
```

### Seed Sample Database

```bash
npm run seed-db
```

Creates 3 sample media entries for testing.

### Check Background Indexing

```javascript
// In React Native Debugger console
import { getIndexingProgress } from '@utils/backgroundIndexer';
console.log(getIndexingProgress());
// Output: { total: 50, completed: 32, failed: 0 }
```

### View Database Contents

Use SQLite Browser:
- Android: `adb shell` → navigate to `/data/data/com.zenlens.gallery/databases/`
- iOS: Use Xcode Device Organizer → App Container → Documents

## 6. Running Tests

```bash
# Run all tests
npm test

# Specific test file
npm test -- similarity.test.ts

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## 7. Troubleshooting

### "Metro bundler failed"

```bash
# Clear cache and rebuild
watchman watch-del-all
npm start -- --reset-cache
```

### "Module not found" error

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Photos not showing

- Grant media library permission in OS settings
- Try seed-db to add test entries
- Check `adb logcat` for errors

### Slow image loading

- Reduce number of concurrent thumbnail loads in `MasonryGrid`
- Check cache size: `await getCacheSize()`
- Clear cache: `await clearOldThumbnails()`

### Search not working

- Ensure media indexed: check `getIndexingProgress()`
- Verify embeddings computed: check metadata table in DB
- Test with fallback captions: query should still work

## 8. Common Workflows

### Add a New Screen

1. Create `src/screens/MyScreen.tsx`
2. Add navigation in `src/navigation/index.tsx`
3. Update theme imports if needed

### Add a New Component

1. Create `src/components/MyComponent.tsx`
2. Import theme: `import { useTheme } from '../styles/theme'`
3. Use in screens

### Add a New AI Feature

1. Create stub in `src/ai/myFeature.ts`
2. Add tests in `src/tests/myFeature.test.ts`
3. Call from appropriate screen/component
4. Add native bridge implementation (iOS/Android)

### Change Color Scheme

Edit `src/context/ThemeContext.tsx`:
```typescript
export const ThemeTokens = {
  dark: {
    primary: '#7C3AED', // Change this
    // ... other colors
  }
};
```

### Modify Database Schema

1. Update `src/db/init.ts` SCHEMA object
2. Add migration logic if upgrading
3. Update `src/db/mediaRepository.ts` types
4. Delete old DB on simulator for testing

## 9. Performance Tips

- **Masonry scroll**: Reduce COLUMN_COUNT if laggy
- **Image loading**: Reduce ITEMS_PER_PAGE from 50
- **Indexing**: Lower concurrency or pause during use
- **Search**: Limit top-N results or use tag fallback

## 10. Build for Production

### iOS

```bash
# Build .ipa
npm run ios -- --release

# Or use EAS (Expo Application Services)
eas build --platform ios
```

### Android

```bash
# Build .apk
npm run android -- --release

# Or generate AAB for Play Store
eas build --platform android
```

## 11. Accessing Sensitive Data (Dev Only)

### Read PIN Hash

```javascript
import * as SecureStore from 'expo-secure-store';
const hash = await SecureStore.getItemAsync('zenlens_pin_hash');
console.log('PIN hash:', hash);
```

### Decrypt DB Key

```javascript
import * as SecureStore from 'expo-secure-store';
const key = await SecureStore.getItemAsync('zenlens_db_key');
console.log('DB key:', key);
```

### Export All Media

```javascript
import { getAllMedia } from '@db/mediaRepository';
const all = await getAllMedia(10000, 0);
console.log(JSON.stringify(all, null, 2));
```

## 12. Next Steps

- [ ] Implement native TFLite models (see NATIVE_BRIDGE_SETUP.md)
- [ ] Add UI for PIN setup & biometric enrollment
- [ ] Implement cloud sync backend
- [ ] Add more filters (B&W, vintage, etc)
- [ ] Implement people album clustering
- [ ] Add batch operations
- [ ] Write E2E tests with Detox

## Useful Links

- [React Native Docs](https://reactnative.dev)
- [React Navigation](https://reactnavigation.org)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated)
- [Shopify Skia](https://shopify.github.io/react-native-skia)
- [TensorFlow Lite](https://www.tensorflow.org/lite)
- [Expo Docs](https://docs.expo.dev)

---

Happy coding! 🚀
