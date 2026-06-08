/**
 * Photo View Screen
 * Full-screen photo viewer with metadata, pinch-zoom, and swipe navigation
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Dimensions,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { getMediaRecord, getMetadataRecord, MediaRecord } from '../db/mediaRepository';
import ProgressiveImage from '../components/ProgressiveImage';
import GlassCard from '../components/GlassCard';

const { width: screenWidth } = Dimensions.get('window');

interface PhotoViewScreenProps {
  route: any;
  navigation: any;
}

export default function PhotoViewScreen({ route, navigation }: PhotoViewScreenProps): JSX.Element {
  const theme = useTheme();
  const { mediaId } = route.params;

  const [media, setMedia] = useState<MediaRecord | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [showMetadata, setShowMetadata] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load media and metadata
   */
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const mediaData = await getMediaRecord(mediaId);
        const metadataData = await getMetadataRecord(mediaId);

        setMedia(mediaData);
        setMetadata(metadataData);
      } catch (error) {
        console.error('Failed to load photo data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [mediaId]);

  /**
   * Handle edit button press
   */
  const handleEdit = useCallback(() => {
    if (media) {
      navigation.navigate('Editor', { mediaId: media.id });
    }
  }, [media, navigation]);

  /**
   * Render metadata panel
   */
  const renderMetadata = useCallback(() => {
    if (!metadata) return null;

    return (
      <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.metadataPanel}>
        <GlassCard style={styles.metadataCard}>
          {metadata.caption && (
            <View style={styles.metadataRow}>
              <Text style={[styles.metadataLabel, { color: theme.colors.textSecondary }]}>
                Caption
              </Text>
              <Text style={[styles.metadataValue, { color: theme.colors.text }]}>
                {metadata.caption}
              </Text>
            </View>
          )}

          {metadata.tags && metadata.tags.length > 0 && (
            <View style={styles.metadataRow}>
              <Text style={[styles.metadataLabel, { color: theme.colors.textSecondary }]}>
                Tags
              </Text>
              <View style={styles.tagContainer}>
                {metadata.tags.map((tag: string, index: number) => (
                  <View
                    key={index}
                    style={[
                      styles.tag,
                      {
                        backgroundColor: theme.colors.primary,
                        opacity: 0.2,
                      },
                    ]}
                  >
                    <Text style={[styles.tagText, { color: theme.colors.primary }]}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {media && (
            <>
              <View style={styles.metadataRow}>
                <Text style={[styles.metadataLabel, { color: theme.colors.textSecondary }]}>
                  Dimensions
                </Text>
                <Text style={[styles.metadataValue, { color: theme.colors.text }]}>
                  {media.width} × {media.height}
                </Text>
              </View>

              <View style={styles.metadataRow}>
                <Text style={[styles.metadataLabel, { color: theme.colors.textSecondary }]}>
                  Created
                </Text>
                <Text style={[styles.metadataValue, { color: theme.colors.text }]}>
                  {new Date(media.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </>
          )}
        </GlassCard>
      </Animated.View>
    );
  }, [metadata, media, theme.colors]);

  if (isLoading || !media) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.background,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
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
      {/* Image Viewer */}
      <View style={styles.imageContainer}>
        <ProgressiveImage
          uri={media.uri}
          style={styles.fullImage}
          thumbnailUri={media.thumbnailUri}
        />

        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Metadata Scroll View */}
      <ScrollView
        style={[
          styles.bottomSheet,
          {
            backgroundColor: theme.colors.surface,
          },
        ]}
        scrollEnabled={showMetadata}
      >
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleEdit}
          >
            <Ionicons name="pencil" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.secondary }]}
            onPress={() => setShowMetadata(!showMetadata)}
          >
            <Ionicons name="information-circle" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Info</Text>
          </TouchableOpacity>
        </View>

        {/* Metadata Content */}
        {showMetadata && renderMetadata()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    flex: 0.6,
    position: 'relative',
  },
  fullImage: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheet: {
    flex: 0.4,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  metadataPanel: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  metadataCard: {
    padding: 16,
    gap: 16,
  },
  metadataRow: {
    gap: 8,
  },
  metadataLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
