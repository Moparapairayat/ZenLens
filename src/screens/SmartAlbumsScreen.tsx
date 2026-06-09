/**
 * Smart Albums Screen
 * Auto-generated albums using clustering algorithms.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { getAllMedia, getMetadataRecord } from '../db/mediaRepository';
import { kMeansClustering, dbscanClustering } from '../ai/clustering';
import { dequantizeEmbedding } from '../ai/embeddingStub';
import GlassCard from '../components/GlassCard';

interface SmartAlbum {
  id: string;
  name: string;
  count: number;
  coverMediaId?: string;
  mediaIds: string[];
}

interface SmartAlbumsScreenProps {
  navigation: any;
}

export default function SmartAlbumsScreen({ navigation }: SmartAlbumsScreenProps): JSX.Element {
  const theme = useTheme();
  const [albums, setAlbums] = useState<SmartAlbum[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [clusteringMethod, setClusteringMethod] = useState<'kmeans' | 'dbscan'>('kmeans');

  useEffect(() => {
    const generateAlbums = async (): Promise<void> => {
      try {
        setIsLoading(true);
        const allMedia = await getAllMedia(10000, 0);
        const embeddings = await Promise.all(
          allMedia.map(async (media) => {
            const metadata = await getMetadataRecord(media.id);
            return metadata?.embeddingQuantized
              ? { mediaId: media.id, embedding: dequantizeEmbedding(metadata.embeddingQuantized) }
              : null;
          })
        );

        const validEmbeddings = embeddings.filter(Boolean) as Array<{
          mediaId: string;
          embedding: Float32Array;
        }>;

        if (validEmbeddings.length === 0) {
          setAlbums([]);
          return;
        }

        const clusters =
          clusteringMethod === 'kmeans'
            ? kMeansClustering(
                validEmbeddings,
                Math.min(8, Math.max(1, Math.ceil(Math.sqrt(validEmbeddings.length / 5))))
              ).clusters
            : dbscanClustering(validEmbeddings, 0.5, 3);

        setAlbums(
          clusters.map((cluster, index) => {
            const mediaIds = cluster.map((idx) => validEmbeddings[idx].mediaId);
            return {
              id: `smart_album_${index}`,
              name: `Signal cluster ${index + 1}`,
              count: mediaIds.length,
              coverMediaId: mediaIds[0],
              mediaIds,
            };
          })
        );
      } catch (error) {
        console.error('Failed to generate albums:', error);
      } finally {
        setIsLoading(false);
      }
    };

    generateAlbums();
  }, [clusteringMethod]);

  const renderAlbumCard = useCallback(
    ({ item, index }: { item: SmartAlbum; index: number }) => (
      <TouchableOpacity
        activeOpacity={0.74}
        accessibilityLabel={`Open ${item.name}`}
        onPress={() =>
          navigation.navigate('AlbumDetail', {
            albumId: item.id,
            mediaIds: item.mediaIds,
          })
        }
      >
        <GlassCard style={styles.albumCard}>
          <View style={styles.albumVisual}>
            <View
              style={[
                styles.albumBlock,
                styles.albumBlockLarge,
                { backgroundColor: index % 2 === 0 ? theme.colors.primary : theme.colors.accent },
              ]}
            />
            <View
              style={[
                styles.albumBlock,
                styles.albumBlockSmall,
                { backgroundColor: index % 2 === 0 ? theme.colors.secondary : theme.colors.warning },
              ]}
            />
            <Ionicons name="albums-outline" size={24} color="#090A0F" style={styles.albumIcon} />
          </View>

          <View style={styles.albumInfo}>
            <Text style={[styles.albumName, { color: theme.colors.text }]}>{item.name}</Text>
            <Text style={[styles.albumCount, { color: theme.colors.textSecondary }]}>
              {item.count} photos grouped by visual similarity
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
        </GlassCard>
      </TouchableOpacity>
    ),
    [navigation, theme.colors]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.colors.secondary }]}>SMART SETS</Text>
          <Text style={[styles.title, { color: theme.colors.text }]}>Auto albums</Text>
        </View>
        <View style={[styles.countBadge, { borderColor: theme.colors.border }]}>
          <Text style={[styles.countBadgeText, { color: theme.colors.text }]}>{albums.length}</Text>
        </View>
      </View>

      <View style={[styles.segmented, { borderColor: theme.colors.border }]}>
        {(['kmeans', 'dbscan'] as const).map((method) => (
          <TouchableOpacity
            key={method}
            accessibilityLabel={`Use ${method} clustering`}
            onPress={() => setClusteringMethod(method)}
            style={[
              styles.segmentButton,
              clusteringMethod === method && { backgroundColor: theme.colors.primary },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                { color: clusteringMethod === method ? '#090A0F' : theme.colors.textSecondary },
              ]}
            >
              {method === 'kmeans' ? 'K-Means' : 'DBSCAN'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {albums.length > 0 ? (
        <FlatList
          data={albums}
          renderItem={renderAlbumCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <GlassCard style={styles.emptyCard}>
            <Ionicons name="git-branch-outline" size={30} color={theme.colors.primary} />
            <View style={styles.emptyTextBlock}>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No clusters yet</Text>
              <Text style={[styles.emptyBody, { color: theme.colors.textSecondary }]}>
                Background indexing will generate albums once embeddings are available.
              </Text>
            </View>
          </GlassCard>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0,
  },
  countBadge: {
    width: 42,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  segmented: {
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 4,
    marginBottom: 14,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '800',
  },
  listContent: {
    paddingBottom: 112,
    gap: 10,
  },
  albumCard: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 12,
  },
  albumVisual: {
    width: 76,
    height: 76,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#090A0F',
  },
  albumBlock: {
    position: 'absolute',
    opacity: 0.88,
  },
  albumBlockLarge: {
    left: 0,
    top: 0,
    width: 52,
    height: 76,
  },
  albumBlockSmall: {
    right: 0,
    bottom: 0,
    width: 32,
    height: 44,
  },
  albumIcon: {
    position: 'absolute',
    left: 26,
    top: 26,
  },
  albumInfo: {
    flex: 1,
    gap: 4,
  },
  albumName: {
    fontSize: 16,
    fontWeight: '800',
  },
  albumCount: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    paddingBottom: 96,
    justifyContent: 'center',
  },
  emptyCard: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  emptyTextBlock: {
    flex: 1,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 18,
  },
});
