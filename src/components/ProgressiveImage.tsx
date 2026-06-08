/**
 * Progressive Image Component
 * Loads thumbnail first, then full resolution image with fade transition
 */
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Image, type ImageContentFit } from 'expo-image';

interface ProgressiveImageProps {
  uri: string;
  thumbnailUri?: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

export default function ProgressiveImage({
  uri,
  thumbnailUri,
  style,
  resizeMode = 'cover',
}: ProgressiveImageProps): JSX.Element {
  const [imageLoaded, setImageLoaded] = useState(false);
  const contentFit: ImageContentFit =
    resizeMode === 'stretch' ? 'fill' : resizeMode === 'center' ? 'contain' : resizeMode;
  useEffect(() => {
    setImageLoaded(false);
  }, [uri]);

  return (
    <View style={[styles.container, style]}>
      {!imageLoaded && thumbnailUri && (
        <Image
          source={thumbnailUri}
          style={[styles.image, style]}
          contentFit={contentFit}
          cachePolicy="memory-disk"
        />
      )}

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
        <Image
          source={uri}
          style={[styles.image, style]}
          contentFit={contentFit}
          cachePolicy="memory-disk"
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
