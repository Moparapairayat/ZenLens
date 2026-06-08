# ZenLens Native Bridge Setup Guide

This document provides step-by-step instructions for integrating TensorFlow Lite models and native code for on-device AI.

## Prerequisites

- React Native development environment set up
- TensorFlow Lite CLI tools installed
- iOS: Xcode 14+, CocoaPods
- Android: Android Studio, NDK

## Step 1: Model Preparation

### 1.1 Convert PyTorch Models to TFLite

```bash
# Install conversion tools
pip install tensorflow tensorflowjs

# Convert PyTorch model
python -c "
import torch
from torch.utils import mobile_optimizer

# Load model
model = torch.hub.load('pytorch/vision', 'mobilenet_v3_small', pretrained=True)

# Convert to TorchScript
scripted = torch.jit.script(model)

# Optimize
optimized = mobile_optimizer.optimize_for_mobile(scripted)

# Export
torch.jit.save(optimized, 'model.pt')
"

# Convert to TFLite using ONNX intermediate
# Alternative: use TensorFlow Hub models directly
```

### 1.2 Quantize Models

```bash
# Post-training quantization (reduces size ~4x)
tflite_convert --output_file=model_quantized.tflite \
  --target_ops=TFLITE_BUILTINS \
  --post_training_quantize \
  model.tflite
```

### 1.3 Model Files to Bundle

- `image_embedding.tflite` (~15-30 MB after quantization)
- `text_embedding.tflite` (~8-15 MB)
- `caption_model.tflite` (~20-40 MB) - optional
- `face_detection.tflite` (~5-10 MB) - optional

## Step 2: iOS Native Setup

### 2.1 Add TensorFlow Lite Pod

```bash
cd ios
# Edit Podfile
pod 'TensorFlowLiteSwift', '~> 2.13.0'
pod 'TensorFlowLiteSelective', '~> 2.13.0'

pod install
```

### 2.2 Add Models to Xcode

1. In Xcode, drag-and-drop `.tflite` files into the project
2. Ensure "Copy items if needed" is checked
3. Select target membership
4. Verify files appear in Build Phases → Copy Bundle Resources

### 2.3 Add Native Module

1. Create `ios/ZenLens/TFLiteModule.swift` (see `NATIVE_BRIDGE_IOS.swift`)
2. Create bridging header `ios/ZenLens/ZenLens-Bridging-Header.h`:

```objective-c
//
//  ZenLens-Bridging-Header.h
//

#ifndef ZenLens_Bridging_Header_h
#define ZenLens_Bridging_Header_h

#import "RCTBridgeModule.h"
#import "RCTEventDispatcher.h"

#endif /* ZenLens_Bridging_Header_h */
```

3. Update `ios/ZenLens.xcodeproj/project.pbxproj`:

```
SWIFT_OBJC_BRIDGING_HEADER = "ZenLens/ZenLens-Bridging-Header.h";
```

### 2.4 Register Module

In `ios/ZenLens/RCTBridge+TFLite.m`:

```objective-c
#import <React/RCTBridge+Private.h>
#import "ZenLens-Swift.h"

@interface RCTBridge (TFLite)
@end

@implementation RCTBridge (TFLite)
- (TFLiteModule *)getTFLiteModule {
    return [self moduleForName:@"TFLiteModule" lazilyLoadIfNotPresent:YES];
}
@end
```

## Step 3: Android Native Setup

### 3.1 Add TensorFlow Lite Dependency

In `android/app/build.gradle`:

```gradle
dependencies {
  implementation 'org.tensorflow:tensorflow-lite:2.13.0'
  implementation 'org.tensorflow:tensorflow-lite-support:0.4.4'
  implementation 'org.tensorflow:tensorflow-lite-gpu:2.13.0'
}
```

### 3.2 Add Models to APK

Create `android/app/src/main/assets/` and copy `.tflite` files there.

### 3.3 Add Native Module

1. Create `android/app/src/main/kotlin/com/zenlens/gallery/TFLiteModule.kt` (see `NATIVE_BRIDGE_ANDROID.kt`)
2. Create package class and register in `MainApplication.kt`

### 3.4 Update Manifest

In `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## Step 4: Update JavaScript Stubs

Replace stubs in `src/ai/embeddingStub.ts`:

```typescript
import { NativeModules } from 'react-native';

const { TFLiteModule } = NativeModules;

export async function runImageEmbedding(imageUri: string): Promise<Float32Array> {
  if (!TFLiteModule?.runImageEmbedding) {
    console.warn('TFLiteModule not available');
    return generatePlaceholderEmbedding(imageUri);
  }

  try {
    const result = await TFLiteModule.runImageEmbedding(imageUri);
    return new Float32Array(result);
  } catch (error) {
    console.error('TFLite error:', error);
    return generatePlaceholderEmbedding(imageUri);
  }
}

export async function runTextEmbedding(text: string): Promise<Float32Array> {
  if (!TFLiteModule?.runTextEmbedding) {
    console.warn('TFLiteModule not available');
    return generatePlaceholderEmbedding(text);
  }

  try {
    const result = await TFLiteModule.runTextEmbedding(text);
    return new Float32Array(result);
  } catch (error) {
    console.error('TFLite error:', error);
    return generatePlaceholderEmbedding(text);
  }
}

function generatePlaceholderEmbedding(input: string): Float32Array {
  // Fallback to deterministic placeholder (existing code)
  // ...
}
```

## Step 5: Model Optimization Tips

### For Smaller APK/IPA

1. **Quantize aggressively**: `post_training_quantize=True` + int8
2. **Use smaller architectures**: MobileNetV2, SqueezeNet
3. **Reduce precision**: float16 instead of float32
4. **Split models**: Load only needed models on demand

### For Better Performance

1. **GPU Delegate** (iOS):
```swift
var options = InterpreterOptions()
options.delegates = [MetalDelegate()]
interpreter = try Interpreter(modelPath: modelPath, options: options)
```

2. **NNAPI Delegate** (Android):
```kotlin
val options = Interpreter.Options().setUseNNAPI(true)
val interpreter = Interpreter(modelBuffer, options)
```

## Step 6: Testing

### iOS

```bash
cd ios
# Build and run with native code
xcodebuild -workspace ZenLens.xcworkspace \
  -scheme ZenLens -configuration Debug \
  -derivedDataPath build

# Or use Xcode directly
```

### Android

```bash
cd android
./gradlew installDebug
# Verify in Android Studio
```

### React Native Debug

```bash
npm run start
# In another terminal
npm run android
# or npm run ios
```

Monitor logs for native errors:
```bash
# iOS
log stream --predicate 'process == "ZenLens"'

# Android
adb logcat | grep TFLite
```

## Troubleshooting

### "Module not found" Error

1. Check native modules are properly registered
2. Verify Swift/Kotlin code compiles
3. Restart Metro bundler

### "Model file not found"

1. Verify `.tflite` files in bundle:
   - iOS: Check Xcode Build Phases
   - Android: Check `src/main/assets/`
2. Verify correct file paths in native code

### Performance Issues

1. Check model quantization
2. Enable GPU delegate
3. Profile with Xcode / Android Profiler
4. Consider smaller models

### Memory Leaks

1. Deallocate interpreters when done
2. Release image buffers
3. Profile with memory sanitizer

## References

- [TensorFlow Lite Guide](https://www.tensorflow.org/lite/guide)
- [TFLite iOS Setup](https://www.tensorflow.org/lite/guide/ios)
- [TFLite Android Setup](https://www.tensorflow.org/lite/guide/android)
- [TFLite Model Optimization](https://www.tensorflow.org/lite/performance/model_optimization)
- [React Native Native Modules](https://reactnative.dev/docs/native-modules-intro)
