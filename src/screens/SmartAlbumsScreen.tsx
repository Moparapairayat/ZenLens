/**
 * Smart Albums Screen
 * Auto-generated albums using clustering algorithms
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
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

  /**
   * Generate smart albums from embeddings
   */
  useEffect(() => {
    const generateAlbums = async () => {
      try {
        setIsLoading(true);

        // Load all media
        const allMedia = await getAllMedia(10000, 0);

        // Get embeddings
        const embeddings = await Promise.all(
          allMedia.map(async (media) => {
            const metadata = await getMetadataRecord(media.id);
            if (metadata?.embeddingQuantized) {
              const embedding = dequantizeEmbedding(metadata.embeddingQuantized);
              return { mediaId: media.id, embedding };
            }
            return null;
          })
        );

        const validEmbeddings = embeddings.filter(Boolean) as any[];

        if (validEmbeddings.length === 0) {
          setAlbums([]);
          setIsLoading(false);
          return;
        }

        // Cluster embeddings
        let clusters: number[][] = [];
        if (clusteringMethod === 'kmeans') {
          const numClusters = Math.min(8, Math.ceil(Math.sqrt(validEmbeddings.length / 5)));
          const result = kMeansClustering(validEmbeddings, numClusters);
          clusters = result.clusters;
        } else {
          clusters = dbscanClustering(validEmbeddings, 0.5, 3);
        }

        // Convert clusters to albums
        const generatedAlbums: SmartAlbum[] = clusters.map((cluster, index) => {
          const mediaIds = cluster.map((idx) => validEmbeddings[idx].mediaId);
          return {
            id: `smart_album_${index}`,
            name: `Album ${index + 1}`,
            count: mediaIds.length,
            coverMediaId: mediaIds[0],
            mediaIds,
          };
        });

        setAlbums(generatedAlbums);
      } catch (error) {
        console.error('Failed to generate albums:', error);
      } finally {
        setIsLoading(false);
      }
    };

    generateAlbums();
  }, [clusteringMethod]);

  /**
   * Render album card
   */
  const renderAlbumCard = useCallback(
    ({ item }: { item: SmartAlbum }) => (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('AlbumDetail', {
            albumId: item.id,
            mediaIds: item.mediaIds,
          })
        }
      >
        <GlassCard style={styles.albumCard}>
          <View
            style={[
              styles.albumThumbnail,
              {
                backgroundColor: theme.colors.surfaceVariant,
              },
            ]}
          >
            {/* TODO: Load thumbnail image */}
          </View>

          <View style={styles.albumInfo}>
            <Text
              style={[
                styles.albumName,
                {
                  color: theme.colors.text,
                },
              ]}
            >
              {item.name}
            </Text>
            <Text
              style={[
                styles.albumCount,
                {
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              {item.count} photos
            </Text>
          </View>
        </GlassCard>
      </TouchableOpacity>
    ),
    [navigation, theme.colors]
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      {/* Clustering Method Selector */}
      <View style={styles.methodSelector}>
        <TouchableOpacity
          style={[
            styles.methodButton,
            clusteringMethod === 'kmeans' && {
              backgroundColor: theme.colors.primary,
            },
          ]}
          onPress={() => setClusteringMethod('kmeans')}
        >
          <Text
            style={[
              styles.methodButtonText,
              {
                color:
                  clusteringMethod === 'kmeans'
                    ? '#FFFFFF'
                    : theme.colors.text,
              },
            ]}
          >
            K-Means
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.methodButton,
            clusteringMethod === 'dbscan' && {
              backgroundColor: theme.colors.primary,
            },
          ]}
          onPress={() => setClusteringMethod('dbscan')}
        >
          <Text
            style={[
              styles.methodButtonText,
              {
                color:
                  clusteringMethod === 'dbscan'
                    ? '#FFFFFF'
                    : theme.colors.text,
              },
            ]}
          >
            DBSCAN
          </Text>
        </TouchableOpacity>
      </View>

      {/* Album List */}
      {albums.length > 0 ? (
        <FlatList
          data={albums}
          renderItem={renderAlbumCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text
            style={[
              styles.emptyText,
              {
                color: theme.colors.textSecondary,
              },
            ]}
          >
            No albums generated yet
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  methodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  methodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    alignItems: 'center',
  },
  methodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  albumCard: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  albumThumbnail: {
    width: 100,
    height: 100,
  },
  albumInfo: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    gap: 4,
  },
  albumName: {
    fontSize: 16,
    fontWeight: '700',
  },
  albumCount: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
