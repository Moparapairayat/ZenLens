/**
 * Search Screen
 * Natural language search with embedding-based similarity
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
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { getAllMedia, getMetadataRecord } from '../db/mediaRepository';
import { runTextEmbedding } from '../ai/embeddingStub';
import { findTopNSimilar } from '../ai/similarity';
import { dequantizeEmbedding } from '../ai/embeddingStub';
import HoloSearchBar from '../components/HoloSearchBar';
import ProgressiveImage from '../components/ProgressiveImage';
import MasonryGrid from '../components/MasonryGrid';

interface SearchResult {
  id: string;
  uri: string;
  score: number;
  filename: string;
}

interface SearchScreenProps {
  navigation: any;
}

export default function SearchScreen({ navigation }: SearchScreenProps): JSX.Element {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [allMedia, setAllMedia] = useState<any[]>([]);

  /**
   * Load all media on mount
   */
  useEffect(() => {
    const loadAllMedia = async () => {
      try {
        // Load all media for similarity search
        const media = await getAllMedia(10000, 0); // Adjust limit as needed
        setAllMedia(media);
      } catch (error) {
        console.error('Failed to load media:', error);
      }
    };

    loadAllMedia();
  }, []);

  /**
   * Perform search
   */
  const handleSearch = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      try {
        setIsSearching(true);

        // Generate query embedding
        const queryEmbedding = await runTextEmbedding(query);

        // Get embeddings for all media
        const candidates = await Promise.all(
          allMedia.map(async (media) => {
            const metadata = await getMetadataRecord(media.id);
            if (metadata?.embeddingQuantized) {
              const embedding = dequantizeEmbedding(metadata.embeddingQuantized);
              return { mediaId: media.id, embedding };
            }
            return null;
          })
        );

        const validCandidates = candidates.filter(Boolean) as any[];

        // Find similar results
        const similar = findTopNSimilar(queryEmbedding, validCandidates, 20);

        // Build results with full media data
        const searchResults = similar
          .map((result) => {
            const mediaData = allMedia.find((m) => m.id === result.mediaId);
            return {
              id: result.mediaId,
              uri: mediaData?.uri,
              score: result.score,
              filename: mediaData?.filename,
            };
          })
          .filter((r) => r.uri);

        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    },
    [allMedia]
  );

  /**
   * Debounced search
   */
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, handleSearch]);

  /**
   * Render grid item
   */
  const renderGridItem = useCallback(
    ({ item }: { item: SearchResult }) => (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('GalleryTab', { screen: 'PhotoView', params: { mediaId: item.id } })}
        style={styles.gridItem}
      >
        <ProgressiveImage uri={item.uri} style={styles.image} />
        <View
          style={[
            styles.scoreOverlay,
            {
              backgroundColor: theme.colors.primary,
            },
          ]}
        >
          <Text style={styles.scoreText}>{(item.score * 100).toFixed(0)}%</Text>
        </View>
      </TouchableOpacity>
    ),
    [navigation, theme.colors.primary]
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
    >
      {/* Search Bar */}
      <HoloSearchBar
        placeholder="Search with natural language..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Loading Indicator */}
      {isSearching && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}

      {/* Results or Empty State */}
      {results.length === 0 && !isSearching && searchQuery.length > 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="search" size={48} color={theme.colors.textTertiary} />
          <Text
            style={[
              styles.emptyText,
              {
                color: theme.colors.textSecondary,
              },
            ]}
          >
            No results found
          </Text>
        </View>
      )}

      {/* Grid of Results */}
      {results.length > 0 && (
        <MasonryGrid
          data={results}
          renderItem={renderGridItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={true}
        />
      )}

      {/* Tips */}
      {results.length === 0 && !isSearching && searchQuery.length === 0 && (
        <View style={styles.tipsContainer}>
          <Text
            style={[
              styles.tipsTitle,
              {
                color: theme.colors.text,
              },
            ]}
          >
            Search Tips
          </Text>
          <Text
            style={[
              styles.tipText,
              {
                color: theme.colors.textSecondary,
              },
            ]}
          >
            • Try descriptive phrases: "sunset over mountains"
          </Text>
          <Text
            style={[
              styles.tipText,
              {
                color: theme.colors.textSecondary,
              },
            ]}
          >
            • Use object names: "dog", "beach", "food"
          </Text>
          <Text
            style={[
              styles.tipText,
              {
                color: theme.colors.textSecondary,
              },
            ]}
          >
            • Combine multiple terms for better results
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    position: 'relative',
  },
  image: {
    flex: 1,
  },
  scoreOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  scoreText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  tipsContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
