/**
 * Gallery Screen
 * Main photo gallery with masonry grid and progressive image loading
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../styles/theme';
import { getAllMedia, MediaRecord } from '../db/mediaRepository';
import { indexMedia } from '../utils/backgroundIndexer';
import MasonryGrid from '../components/MasonryGrid';
import ProgressiveImage from '../components/ProgressiveImage';

const ITEMS_PER_PAGE = 50;

interface GalleryScreenProps {
  navigation: any;
}

export default function GalleryScreen({ navigation }: GalleryScreenProps): JSX.Element {
  const theme = useTheme();
  const [mediaItems, setMediaItems] = useState<MediaRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  /**
   * Load media items from database
   */
  const loadMedia = useCallback(
    async (pageOffset: number = 0) => {
      try {
        setIsLoading(true);
        const items = await getAllMedia(ITEMS_PER_PAGE, pageOffset);

        if (pageOffset === 0) {
          setMediaItems(items);
        } else {
          setMediaItems((prev) => [...prev, ...items]);
        }

        setHasMore(items.length === ITEMS_PER_PAGE);
        setOffset(pageOffset);

        // Start background indexing for new items
        items.forEach((item) => {
          indexMedia(item.id).catch((error) => console.error('Indexing error:', error));
        });
      } catch (error) {
        console.error('Failed to load media:', error);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Initial load
   */
  useEffect(() => {
    loadMedia(0);
  }, [loadMedia]);

  /**
   * Handle load more
   */
  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      loadMedia(offset + ITEMS_PER_PAGE);
    }
  }, [hasMore, isLoading, loadMedia, offset]);

  /**
   * Navigate to photo view
   */
  const handlePhotoPress = useCallback(
    (mediaId: string) => {
      navigation.navigate('PhotoView', { mediaId });
    },
    [navigation]
  );

  /**
   * Render grid item
   */
  const renderGridItem = useCallback(
    ({ item }: { item: MediaRecord }) => (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handlePhotoPress(item.id)}
        style={styles.gridItem}
      >
        <Animated.View entering={FadeInDown.delay(100)}>
          <ProgressiveImage uri={item.uri} style={styles.image} />
        </Animated.View>
      </TouchableOpacity>
    ),
    [handlePhotoPress]
  );

  /**
   * Render footer with loading indicator
   */
  const renderFooter = useCallback(() => {
    if (!isLoading || mediaItems.length === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }, [isLoading, mediaItems.length, theme.colors.primary]);

  if (isLoading && mediaItems.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <MasonryGrid
        data={mediaItems}
        renderItem={renderGridItem}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gridItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
  },
  image: {
    flex: 1,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
