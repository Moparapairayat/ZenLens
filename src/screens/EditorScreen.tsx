/**
 * Editor Screen
 * Non-destructive photo editing with Skia filters and operations stack
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../styles/theme';
import { getMediaRecord, getEditStack, addEditOperation } from '../db/mediaRepository';
import { exportImage } from '../utils/imageUtils';
import ProgressiveImage from '../components/ProgressiveImage';
import SkiaFilterPreview from '../components/SkiaFilterPreview';

interface EditorScreenProps {
  route: any;
  navigation: any;
}

interface EditOp {
  type: 'crop' | 'rotate' | 'exposure' | 'contrast' | 'saturation' | 'filter' | 'export';
  params: Record<string, any>;
}

type FilterPreviewType = 'original' | 'filter' | 'warm' | 'cool';

const FILTER_PRESETS: Array<{
  name: string;
  type: FilterPreviewType;
  params: Record<string, number>;
}> = [
  { name: 'Original', type: 'original', params: {} },
  { name: 'Warm', type: 'filter', params: { colorTemp: 1500 } },
  { name: 'Cool', type: 'filter', params: { colorTemp: 8000 } },
  { name: 'B&W', type: 'filter', params: { saturation: -100 } },
  { name: 'Vibrant', type: 'filter', params: { saturation: 50 } },
];

const ADJUSTMENT_RANGES = {
  exposure: { min: -2, max: 2, step: 0.1, unit: '' },
  contrast: { min: -100, max: 100, step: 5, unit: '%' },
  saturation: { min: -100, max: 100, step: 5, unit: '%' },
  rotation: { min: 0, max: 360, step: 90, unit: '°' },
};

export default function EditorScreen({ route, navigation }: EditorScreenProps): JSX.Element {
  const theme = useTheme();
  const { mediaId } = route.params;

  const [media, setMedia] = useState<any>(null);
  const [editStack, setEditStack] = useState<EditOp[]>([]);
  const [currentAdjustments, setCurrentAdjustments] = useState({
    exposure: 0,
    contrast: 0,
    saturation: 0,
  });
  const [selectedFilter, setSelectedFilter] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  /**
   * Load media and edit history
   */
  useEffect(() => {
    const loadData = async () => {
      try {
        const mediaData = await getMediaRecord(mediaId);
        const edits = await getEditStack(mediaId);

        setMedia(mediaData);
        setEditStack(edits.map((e: any) => ({ type: e.operationType, params: e.params })));
      } catch (error) {
        console.error('Failed to load editor data:', error);
      }
    };

    loadData();
  }, [mediaId]);

  /**
   * Add adjustment operation
   */
  const addAdjustment = useCallback((type: string, value: number) => {
    setCurrentAdjustments((prev) => ({
      ...prev,
      [type]: value,
    }));
  }, []);

  /**
   * Apply operation
   */
  const applyOperation = useCallback(
    async (type: string, params: Record<string, any>) => {
      try {
        const operationIndex = editStack.length;
        await addEditOperation({
          mediaId,
          operationIndex,
          operationType: type as any,
          params,
          isFinal: false,
          createdAt: Date.now(),
        });

        setEditStack((prev) => [...prev, { type: type as any, params }]);
      } catch (error) {
        console.error('Failed to add operation:', error);
        Alert.alert('Error', 'Failed to apply operation');
      }
    },
    [editStack.length, mediaId]
  );

  /**
   * Export edited image
   */
  const handleExport = useCallback(async () => {
    if (!media) return;

    try {
      setIsExporting(true);
      // TODO: Apply all edit operations from stack
      const exportedUri = await exportImage(media.uri, `edited_${mediaId}.jpg`);

      if (exportedUri) {
        // Save export path to database
        await addEditOperation({
          mediaId,
          operationIndex: editStack.length,
          operationType: 'export' as any,
          params: { exportedUri },
          isFinal: true,
          createdAt: Date.now(),
        });

        Alert.alert('Success', 'Image exported successfully', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export image');
    } finally {
      setIsExporting(false);
    }
  }, [media, mediaId, editStack.length, navigation]);

  if (!media) {
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
      {/* Preview */}
      <View style={styles.previewContainer}>
        <SkiaFilterPreview
          uri={media.uri}
          adjustments={currentAdjustments}
          filterType={selectedFilter > 0 ? FILTER_PRESETS[selectedFilter].type : 'original'}
        />
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {FILTER_PRESETS.map((filter, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.filterButton,
              selectedFilter === index && {
                borderColor: theme.colors.primary,
                borderWidth: 2,
              },
            ]}
            onPress={() => setSelectedFilter(index)}
          >
            <Text
              style={[
                styles.filterButtonText,
                {
                  color: selectedFilter === index ? theme.colors.primary : theme.colors.text,
                },
              ]}
            >
              {filter.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Adjustments */}
      <ScrollView
        style={[
          styles.adjustmentsContainer,
          {
            backgroundColor: theme.colors.surface,
          },
        ]}
        contentContainerStyle={styles.adjustmentsContent}
      >
        {Object.entries(ADJUSTMENT_RANGES).map(([key, range]: any) => (
          <View key={key} style={styles.adjustmentRow}>
            <Text style={[styles.adjustmentLabel, { color: theme.colors.text }]}>
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </Text>
            <Text
              style={[
                styles.adjustmentValue,
                { color: theme.colors.primary },
              ]}
            >
              {currentAdjustments[key as keyof typeof currentAdjustments] || 0}
              {range.unit}
            </Text>
            {/* TODO: Add slider component */}
          </View>
        ))}
      </ScrollView>

      {/* Action Buttons */}
      <View
        style={[
          styles.actionBar,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.actionBarButton, { backgroundColor: theme.colors.error }]}
          onPress={() => navigation.goBack()}
          disabled={isExporting}
        >
          <Text style={styles.actionBarButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBarButton, { backgroundColor: theme.colors.success }]}
          onPress={handleExport}
          disabled={isExporting}
        >
          <Text style={styles.actionBarButtonText}>
            {isExporting ? 'Exporting...' : 'Export'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  previewContainer: {
    flex: 0.5,
  },
  filtersContainer: {
    height: 80,
    paddingHorizontal: 12,
  },
  filtersContent: {
    gap: 8,
    paddingVertical: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    justifyContent: 'center',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  adjustmentsContainer: {
    flex: 0.3,
  },
  adjustmentsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  adjustmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adjustmentLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  adjustmentValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  actionBarButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
