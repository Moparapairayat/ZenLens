/**
 * Search Screen
 * Natural language search with embedding-based similarity.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { getAllMedia, getMetadataRecord, type MediaRecord } from '../db/mediaRepository';
import { runTextEmbedding, dequantizeEmbedding } from '../ai/embeddingStub';
import { findTopNSimilar } from '../ai/similarity';
import GlassCard from '../components/GlassCard';
import HoloSearchBar from '../components/HoloSearchBar';
import MasonryGrid from '../components/MasonryGrid';
import ProgressiveImage from '../components/ProgressiveImage';

interface SearchResult {
  id: string;
  uri: string;
  score: number;
  filename: string;
}

interface SearchScreenProps {
  navigation: any;
}

const queryChips = ['night portraits', 'food table', 'quiet streets', 'green landscape'];

export default function SearchScreen({ navigation }: SearchScreenProps): JSX.Element {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [allMedia, setAllMedia] = useState<MediaRecord[]>([]);

  useEffect(() => {
    const loadAllMedia = async (): Promise<void> => {
      try {
        setAllMedia(await getAllMedia(10000, 0));
      } catch (error) {
        console.error('Failed to load media:', error);
      }
    };

    loadAllMedia();
  }, []);

  const handleSearch = useCallback(
    async (query: string): Promise<void> => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      try {
        setIsSearching(true);
        const queryEmbedding = await runTextEmbedding(query);
        const candidates = await Promise.all(
          allMedia.map(async (media) => {
            const metadata = await getMetadataRecord(media.id);
            return metadata?.embeddingQuantized
              ? { mediaId: media.id, embedding: dequantizeEmbedding(metadata.embeddingQuantized) }
              : null;
          })
        );

        const similar = findTopNSimilar(
          queryEmbedding,
          candidates.filter(Boolean) as Array<{ mediaId: string; embedding: Float32Array }>,
          20
        );

        setResults(
          similar
            .map((result) => {
              const mediaData = allMedia.find((media) => media.id === result.mediaId);
              return mediaData
                ? {
                    id: result.mediaId,
                    uri: mediaData.uri,
                    score: result.score,
                    filename: mediaData.filename,
                  }
                : null;
            })
            .filter(Boolean) as SearchResult[]
        );
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    },
    [allMedia]
  );

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 420);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, handleSearch]);

  const renderGridItem = useCallback(
    ({ item }: { item: SearchResult }) => (
      <TouchableOpacity
        activeOpacity={0.74}
        accessibilityLabel={`Open ${item.filename}`}
        onPress={() => navigation.navigate('GalleryTab', { screen: 'PhotoView', params: { mediaId: item.id } })}
        style={styles.gridItem}
      >
        <ProgressiveImage uri={item.uri} style={styles.image} />
        <View style={[styles.scoreOverlay, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.scoreText}>{Math.max(0, item.score * 100).toFixed(0)}%</Text>
        </View>
      </TouchableOpacity>
    ),
    [navigation, theme.colors.primary]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.headerContent}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={[styles.eyebrow, { color: theme.colors.accent }]}>SEMANTIC FIND</Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>Ask the archive</Text>
          </View>
          <View style={[styles.indexPill, { borderColor: theme.colors.border }]}>
            <Ionicons name="layers-outline" size={15} color={theme.colors.primary} />
            <Text style={[styles.indexPillText, { color: theme.colors.textSecondary }]}>
              {allMedia.length}
            </Text>
          </View>
        </View>

        <HoloSearchBar
          placeholder="Search photos by scene, object, mood"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={styles.chipRow}>
          {queryChips.map((chip) => (
            <TouchableOpacity
              key={chip}
              accessibilityLabel={`Search ${chip}`}
              onPress={() => setSearchQuery(chip)}
              style={[styles.chip, { borderColor: theme.colors.border }]}
            >
              <Text style={[styles.chipText, { color: theme.colors.textSecondary }]}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {isSearching && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}

      {!isSearching && results.length > 0 && (
        <MasonryGrid data={results} renderItem={renderGridItem} keyExtractor={(item) => item.id} />
      )}

      {!isSearching && results.length === 0 && (
        <View style={styles.emptyContainer}>
          <GlassCard style={styles.emptyCard}>
            <Ionicons
              name={searchQuery ? 'search-outline' : 'sparkles-outline'}
              size={30}
              color={theme.colors.primary}
            />
            <View style={styles.emptyTextBlock}>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                {searchQuery ? 'No matches yet' : 'Semantic index ready'}
              </Text>
              <Text style={[styles.emptyBody, { color: theme.colors.textSecondary }]}>
                {allMedia.length === 0
                  ? 'Indexed photos will appear here after local media is added.'
                  : 'Try a more visual phrase or choose one of the chips above.'}
              </Text>
            </View>
          </GlassCard>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    gap: 3,
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
  indexPill: {
    height: 34,
    minWidth: 58,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  indexPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridItem: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
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
    borderRadius: 8,
  },
  scoreText: {
    color: '#090A0F',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 16,
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
