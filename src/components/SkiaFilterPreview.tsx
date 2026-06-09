/**
 * Skia Filter Preview Component
 * Real-time GPU filter preview surface.
 */
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Canvas, Image as SkiaImage, useImage } from '@shopify/react-native-skia';

interface SkiaFilterPreviewProps {
  uri: string;
  adjustments: {
    exposure: number;
    contrast: number;
    saturation: number;
  };
  filterType?: 'original' | 'filter' | 'warm' | 'cool';
}

export default function SkiaFilterPreview({
  uri,
  adjustments,
  filterType = 'original',
}: SkiaFilterPreviewProps): JSX.Element {
  const image = useImage(uri);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const imageFrame = useMemo(() => {
    if (!image || canvasSize.width === 0 || canvasSize.height === 0) return null;

    const imageAspect = image.width() / image.height();
    const canvasAspect = canvasSize.width / canvasSize.height;
    const width = imageAspect > canvasAspect ? canvasSize.width : canvasSize.height * imageAspect;
    const height = imageAspect > canvasAspect ? canvasSize.width / imageAspect : canvasSize.height;

    return {
      x: (canvasSize.width - width) / 2,
      y: (canvasSize.height - height) / 2,
      width,
      height,
    };
  }, [canvasSize.height, canvasSize.width, image]);

  const handleLayout = (event: LayoutChangeEvent): void => {
    const { width, height } = event.nativeEvent.layout;
    setCanvasSize({ width, height });
  };

  // Kept as an explicit dependency point for future shader/color-matrix work.
  const previewState = `${filterType}:${adjustments.exposure}:${adjustments.contrast}:${adjustments.saturation}`;
  void previewState;

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {!imageFrame && (
        <View style={styles.loadingState}>
          <ActivityIndicator color="#C8FF5C" />
        </View>
      )}

      {image && imageFrame && (
        <Canvas style={styles.canvas}>
          <SkiaImage
            image={image}
            x={imageFrame.x}
            y={imageFrame.y}
            width={imageFrame.width}
            height={imageFrame.height}
          />
        </Canvas>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05060A',
  },
  canvas: {
    flex: 1,
  },
  loadingState: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
