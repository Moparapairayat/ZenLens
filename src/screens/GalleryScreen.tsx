/**
 * Gallery Screen
 * Local-first photo command surface with masonry grid and empty web state.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../styles/theme';
import { getAllMedia, MediaRecord } from '../db/mediaRepository';
import { indexMedia } from '../utils/backgroundIndexer';
import { syncDeviceMediaLibrary, type MediaLibrarySyncResult } from '../utils/mediaLibrarySync';
import GlassCard from '../components/GlassCard';
import MasonryGrid from '../components/MasonryGrid';
import ProgressiveImage from '../components/ProgressiveImage';

const ITEMS_PER_PAGE = 50;

interface GalleryScreenProps {
  navigation: any;
}

const previewTiles = [
  { color: '#C8FF5C', height: 128 },
  { color: '#4DEEEA', height: 168 },
  { color: '#FF6B8A', height: 112 },
  { color: '#34D399', height: 148 },
  { color: '#FBBF24', height: 132 },
  { color: '#A78BFA', height: 176 },
];

export default function GalleryScreen({ navigation }: GalleryScreenProps): JSX.Element {
  const theme = useTheme();
  const [mediaItems, setMediaItems] = useState<MediaRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<MediaLibrarySyncResult | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const indexedLabel = useMemo(() => `${mediaItems.length}`, [mediaItems.length]);

  const syncLibrary = useCallback(async (): Promise<void> => {
    setIsSyncing(true);
    try {
      setSyncResult(await syncDeviceMediaLibrary());
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const loadMedia = useCallback(async (pageOffset = 0, shouldSync = pageOffset === 0): Promise<void> => {
    try {
      setIsLoading(true);

      if (shouldSync) {
        await syncLibrary();
      }

      const items = await getAllMedia(ITEMS_PER_PAGE, pageOffset);

      if (pageOffset === 0) {
        setMediaItems(items);
      } else {
        setMediaItems((prev) => [...prev, ...items]);
      }

      setHasMore(items.length === ITEMS_PER_PAGE);
      setOffset(pageOffset);

      items.forEach((item) => {
        indexMedia(item.id).catch((error) => console.error('Indexing error:', error));
      });
    } catch (error) {
      console.error('Failed to load media:', error);
    } finally {
      setIsLoading(false);
    }
  }, [syncLibrary]);

  useEffect(() => {
    loadMedia(0);
  }, [loadMedia]);

  const handleLoadMore = useCallback((): void => {
    if (hasMore && !isLoading) {
      loadMedia(offset + ITEMS_PER_PAGE, false);
    }
  }, [hasMore, isLoading, loadMedia, offset]);

  const handlePhotoPress = useCallback(
    (mediaId: string): void => {
      navigation.navigate('PhotoView', { mediaId });
    },
    [navigation]
  );

  const handleSyncNow = useCallback((): void => {
    loadMedia(0, true);
  }, [loadMedia]);

  const renderGridItem = useCallback(
    ({ item }: { item: MediaRecord }) => (
      <TouchableOpacity
        activeOpacity={0.74}
        accessibilityLabel={`Open ${item.filename}`}
        onPress={() => handlePhotoPress(item.id)}
        style={styles.gridItem}
      >
        <Animated.View entering={FadeInDown.delay(80)} style={styles.gridImageFrame}>
          <ProgressiveImage uri={item.uri} thumbnailUri={item.thumbnailUri} style={styles.image} />
        </Animated.View>
      </TouchableOpacity>
    ),
    [handlePhotoPress]
  );

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
      <SafeAreaView style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  if (mediaItems.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ScrollView style={styles.container} contentContainerStyle={styles.emptyContent}>
          <View style={styles.heroRow}>
            <View style={styles.titleBlock}>
              <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>ZENLENS</Text>
              <Text style={[styles.title, { color: theme.colors.text }]}>Local gallery intelligence</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {Platform.OS === 'web'
                ? 'Web preview is ready. Native media appears after device permission.'
                : syncResult?.status === 'permission-denied'
                  ? 'Photo permission is blocked. Allow access to show your local photos.'
                  : syncResult?.message || 'Media appears after library permission and background indexing.'}
            </Text>
            </View>

            <View style={[styles.liveBadge, { borderColor: theme.colors.border }]}>
              <Ionicons name="radio" size={16} color={theme.colors.accent} />
              <Text style={[styles.liveBadgeText, { color: theme.colors.textSecondary }]}>Local</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <GlassCard style={styles.metricCard}>
              <Ionicons name="images-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.metricValue, { color: theme.colors.text }]}>{indexedLabel}</Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textTertiary }]}>Indexed</Text>
            </GlassCard>
            <GlassCard style={styles.metricCard}>
              <Ionicons name="sparkles-outline" size={18} color={theme.colors.accent} />
              <Text style={[styles.metricValue, { color: theme.colors.text }]}>On</Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textTertiary }]}>AI queue</Text>
            </GlassCard>
            <GlassCard style={styles.metricCard}>
              <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.secondary} />
              <Text style={[styles.metricValue, { color: theme.colors.text }]}>Private</Text>
              <Text style={[styles.metricLabel, { color: theme.colors.textTertiary }]}>Storage</Text>
            </GlassCard>
          </View>

          <View style={styles.previewGrid}>
            {previewTiles.map((tile, index) => (
              <View
                key={tile.color}
                style={[
                  styles.previewTile,
                  {
                    height: tile.height,
                    backgroundColor: tile.color,
                    opacity: 0.18 + index * 0.05,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={index % 2 === 0 ? 'aperture-outline' : 'scan-outline'}
                  size={22}
                  color={tile.color}
                />
              </View>
            ))}
          </View>

          <GlassCard style={styles.statusPanel}>
            <View style={styles.statusIcon}>
              <Ionicons
                name={syncResult?.status === 'permission-denied' ? 'lock-closed-outline' : 'cloud-offline-outline'}
                size={22}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.statusText}>
              <Text style={[styles.statusTitle, { color: theme.colors.text }]}>
                {syncResult?.status === 'permission-denied'
                  ? 'Photo access needed'
                  : isSyncing
                    ? 'Syncing device library'
                    : 'Offline index waiting'}
              </Text>
              <Text style={[styles.statusBody, { color: theme.colors.textSecondary }]}>
                {Platform.OS === 'web'
                  ? 'Use Android or iOS to grant library access. Web preview keeps the interface visible.'
                  : syncResult?.message ||
                    'Tap sync and allow photo access so ZenLens can import your recent local photos.'}
              </Text>
            </View>
            {Platform.OS !== 'web' && (
              <TouchableOpacity
                accessibilityLabel="Sync local photo library"
                onPress={handleSyncNow}
                disabled={isSyncing}
                style={[styles.syncButton, { backgroundColor: theme.colors.primary }]}
              >
                {isSyncing ? (
                  <ActivityIndicator color="#090A0F" />
                ) : (
                  <Ionicons name="sync" size={18} color="#090A0F" />
                )}
              </TouchableOpacity>
            )}
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.loadedHeader}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>LIBRARY</Text>
          <Text style={[styles.loadedTitle, { color: theme.colors.text }]}>{mediaItems.length} items</Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Refresh gallery"
          onPress={handleSyncNow}
          style={[styles.iconButton, { borderColor: theme.colors.border }]}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator color={theme.colors.primary} />
          ) : (
            <Ionicons name="refresh" size={18} color={theme.colors.text} />
          )}
        </TouchableOpacity>
      </View>

      <MasonryGrid
        data={mediaItems}
        renderItem={renderGridItem}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        keyExtractor={(item) => item.id}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContent: {
    padding: 18,
    paddingBottom: 112,
    gap: 18,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  titleBlock: {
    flex: 1,
    gap: 6,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
  },
  title: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  liveBadge: {
    minWidth: 76,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  liveBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minHeight: 94,
    padding: 12,
    justifyContent: 'space-between',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewTile: {
    width: '31.8%',
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  statusIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(200, 255, 92, 0.08)',
  },
  statusText: {
    flex: 1,
    gap: 4,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  statusBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  syncButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  loadedTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
  },
  gridImageFrame: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    flex: 1,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
