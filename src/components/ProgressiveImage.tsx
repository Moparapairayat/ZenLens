/**
 * Progressive Image Component
 * Loads thumbnail first, then full resolution image with fade transition
 */
import React, { useState, useEffect } from 'react';
import { Image, StyleSheet, View, ImageStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import FastImage, { ImageStyle as FastImageStyle } from 'react-native-fast-image';

interface ProgressiveImageProps {
  uri: string;
  thumbnailUri?: string;
  style?: ImageStyle | FastImageStyle;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

export default function ProgressiveImage({
  uri,
  thumbnailUri,
  style,
  resizeMode = 'cover',
}: ProgressiveImageProps): JSX.Element {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [thumbnailLoaded, setThumbnailLoaded] = useState(!thumbnailUri);

  useEffect(() => {
    // Reset loaded state when URI changes
    setImageLoaded(false);
    if (!thumbnailUri) {
      setThumbnailLoaded(true);
    }
  }, [uri, thumbnailUri]);

  return (
    <View style={[styles.container, style]}>
      {/* Thumbnail (shown while loading) */}
      {!imageLoaded && thumbnailUri && (
        <FastImage
          source={{ uri: thumbnailUri, priority: FastImage.priority.low }}
          style={[styles.image, style]}
          resizeMode={resizeMode}
          onLoad={() => setThumbnailLoaded(true)}
        />
      )}

      {/* Full resolution image (fades in) */}
      <Animated.View
        style={[
          styles.image,
          style,
          {
            opacity: imageLoaded ? 1 : 0,
          },
        ]}
        entering={FadeIn.duration(300)}
      >
        <FastImage
          source={{ uri, priority: FastImage.priority.high }}
          style={[styles.image, style]}
          resizeMode={resizeMode}
          onLoad={() => setImageLoaded(true)}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
