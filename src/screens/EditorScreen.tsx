/**
 * Editor Screen
 * Non-destructive photo editing workspace.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../styles/theme';
import { addEditOperation, getEditStack, getMediaRecord, type MediaRecord } from '../db/mediaRepository';
import { exportImage } from '../utils/imageUtils';
import GlassCard from '../components/GlassCard';
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
type AdjustmentKey = 'exposure' | 'contrast' | 'saturation';

const FILTER_PRESETS: Array<{
  name: string;
  tone: string;
  type: FilterPreviewType;
  params: Partial<Record<AdjustmentKey, number>>;
}> = [
  { name: 'Original', tone: '#F1F5F9', type: 'original', params: {} },
  { name: 'Warm', tone: '#FBBF24', type: 'warm', params: { saturation: 10 } },
  { name: 'Cool', tone: '#4DEEEA', type: 'cool', params: { contrast: 8 } },
  { name: 'Mono', tone: '#B8B6C7', type: 'filter', params: { saturation: -100 } },
  { name: 'Vivid', tone: '#C8FF5C', type: 'filter', params: { saturation: 45, contrast: 12 } },
];

const ADJUSTMENTS: Array<{
  key: AdjustmentKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  min: number;
  max: number;
  step: number;
  unit: string;
}> = [
  { key: 'exposure', label: 'Exposure', icon: 'sunny-outline', min: -2, max: 2, step: 0.1, unit: '' },
  { key: 'contrast', label: 'Contrast', icon: 'contrast-outline', min: -100, max: 100, step: 5, unit: '%' },
  { key: 'saturation', label: 'Saturation', icon: 'color-filter-outline', min: -100, max: 100, step: 5, unit: '%' },
];

const initialAdjustments: Record<AdjustmentKey, number> = {
  exposure: 0,
  contrast: 0,
  saturation: 0,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function adjustmentPercent(value: number, min: number, max: number): `${number}%` {
  return `${((value - min) / (max - min)) * 100}%`;
}

function formatAdjustmentValue(value: number, unit: string): string {
  const normalized = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
  return `${value > 0 ? '+' : ''}${normalized}${unit}`;
}

export default function EditorScreen({ route, navigation }: EditorScreenProps): JSX.Element {
  const theme = useTheme();
  const { mediaId } = route.params;

  const [media, setMedia] = useState<MediaRecord | null>(null);
  const [editStack, setEditStack] = useState<EditOp[]>([]);
  const [currentAdjustments, setCurrentAdjustments] =
    useState<Record<AdjustmentKey, number>>(initialAdjustments);
  const [selectedFilter, setSelectedFilter] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const selectedPreset = FILTER_PRESETS[selectedFilter];

  const activeAdjustmentCount = useMemo(
    () => Object.values(currentAdjustments).filter((value) => value !== 0).length,
    [currentAdjustments]
  );

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      try {
        setIsLoading(true);
        const mediaData = await getMediaRecord(mediaId);
        const edits = await getEditStack(mediaId);

        setMedia(mediaData);
        setEditStack(edits.map((edit: any) => ({ type: edit.operationType, params: edit.params })));
      } catch (error) {
        console.error('Failed to load editor data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [mediaId]);

  const applyOperation = useCallback(
    async (type: EditOp['type'], params: Record<string, any>): Promise<void> => {
      try {
        await addEditOperation({
          mediaId,
          operationIndex: editStack.length,
          operationType: type as any,
          params,
          isFinal: false,
          createdAt: Date.now(),
        });

        setEditStack((prev) => [...prev, { type, params }]);
      } catch (error) {
        console.error('Failed to add operation:', error);
        Alert.alert('Error', 'Failed to apply operation');
      }
    },
    [editStack.length, mediaId]
  );

  const selectFilter = useCallback((index: number): void => {
    const preset = FILTER_PRESETS[index];
    setSelectedFilter(index);
    setCurrentAdjustments((prev) => ({
      ...prev,
      ...preset.params,
    }));
  }, []);

  const nudgeAdjustment = useCallback((key: AdjustmentKey, delta: number): void => {
    const adjustment = ADJUSTMENTS.find((item) => item.key === key);
    if (!adjustment) return;

    setCurrentAdjustments((prev) => ({
      ...prev,
      [key]: clamp(Number((prev[key] + delta).toFixed(1)), adjustment.min, adjustment.max),
    }));
  }, []);

  const resetLook = useCallback((): void => {
    setSelectedFilter(0);
    setCurrentAdjustments(initialAdjustments);
  }, []);

  const handleApplyLook = useCallback(async (): Promise<void> => {
    await applyOperation('filter', {
      preset: selectedPreset.name,
      adjustments: currentAdjustments,
    });
  }, [applyOperation, currentAdjustments, selectedPreset.name]);

  const handleExport = useCallback(async (): Promise<void> => {
    if (!media) return;

    try {
      setIsExporting(true);
      const exportedUri = await exportImage(media.uri, `edited_${mediaId}.jpg`);

      if (exportedUri) {
        await addEditOperation({
          mediaId,
          operationIndex: editStack.length,
          operationType: 'export' as any,
          params: { exportedUri, preset: selectedPreset.name, adjustments: currentAdjustments },
          isFinal: true,
          createdAt: Date.now(),
        });

        Alert.alert('Export complete', 'Edited photo saved successfully', [
          {
            text: 'Done',
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
  }, [currentAdjustments, editStack.length, media, mediaId, navigation, selectedPreset.name]);

  if (isLoading || !media) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.topBar}>
          <TouchableOpacity
            accessibilityLabel="Close editor"
            onPress={() => navigation.goBack()}
            style={[styles.iconButton, { borderColor: theme.colors.border }]}
          >
            <Ionicons name="close" size={22} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Opening darkroom</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.topBar, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          accessibilityLabel="Close editor"
          onPress={() => navigation.goBack()}
          style={[styles.iconButton, { borderColor: theme.colors.border }]}
          disabled={isExporting}
        >
          <Ionicons name="close" size={22} color={theme.colors.text} />
        </TouchableOpacity>

        <View style={styles.titleBlock}>
          <Text style={[styles.eyebrow, { color: theme.colors.accent }]}>ZEN EDIT</Text>
          <Text numberOfLines={1} style={[styles.title, { color: theme.colors.text }]}>
            {media.filename}
          </Text>
        </View>

        <TouchableOpacity
          accessibilityLabel="Export edited image"
          onPress={handleExport}
          style={[styles.doneButton, { backgroundColor: theme.colors.primary }]}
          disabled={isExporting}
        >
          <Ionicons name="download-outline" size={18} color="#090A0F" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(260)} style={styles.previewShell}>
          <SkiaFilterPreview
            uri={media.uri}
            adjustments={currentAdjustments}
            filterType={selectedPreset.type}
          />
          <View style={styles.previewScrim}>
            <View style={[styles.previewPill, { backgroundColor: theme.colors.glass }]}>
              <Ionicons name="aperture-outline" size={14} color={theme.colors.primary} />
              <Text style={[styles.previewPillText, { color: theme.colors.text }]}>
                {selectedPreset.name}
              </Text>
            </View>
            <View style={[styles.previewPill, { backgroundColor: theme.colors.glass }]}>
              <Ionicons name="layers-outline" size={14} color={theme.colors.accent} />
              <Text style={[styles.previewPillText, { color: theme.colors.text }]}>
                {editStack.length} ops
              </Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.statRow}>
          <GlassCard style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{editStack.length}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>Stack</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{selectedPreset.name}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>Look</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{activeAdjustmentCount}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>Tweaks</Text>
          </GlassCard>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Looks</Text>
          <TouchableOpacity accessibilityLabel="Reset look" onPress={resetLook} style={styles.textCommand}>
            <Ionicons name="refresh" size={15} color={theme.colors.textSecondary} />
            <Text style={[styles.textCommandLabel, { color: theme.colors.textSecondary }]}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
          {FILTER_PRESETS.map((filter, index) => {
            const isSelected = selectedFilter === index;

            return (
              <TouchableOpacity
                key={filter.name}
                accessibilityLabel={`Use ${filter.name} look`}
                activeOpacity={0.78}
                onPress={() => selectFilter(index)}
                style={[
                  styles.filterCard,
                  {
                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    backgroundColor: isSelected ? 'rgba(200, 255, 92, 0.1)' : theme.colors.glass,
                  },
                ]}
              >
                <View style={[styles.filterSwatch, { backgroundColor: filter.tone }]} />
                <Text style={[styles.filterName, { color: isSelected ? theme.colors.primary : theme.colors.text }]}>
                  {filter.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Adjust</Text>
          <Text style={[styles.sectionMeta, { color: theme.colors.textTertiary }]}>Non-destructive</Text>
        </View>

        <View style={styles.adjustmentList}>
          {ADJUSTMENTS.map((adjustment) => {
            const value = currentAdjustments[adjustment.key];

            return (
              <GlassCard key={adjustment.key} style={styles.adjustmentCard}>
                <View style={styles.adjustmentTop}>
                  <View style={styles.adjustmentLabelBlock}>
                    <View style={[styles.adjustmentIcon, { backgroundColor: 'rgba(77, 238, 234, 0.1)' }]}>
                      <Ionicons name={adjustment.icon} size={18} color={theme.colors.accent} />
                    </View>
                    <Text style={[styles.adjustmentLabel, { color: theme.colors.text }]}>{adjustment.label}</Text>
                  </View>
                  <Text style={[styles.adjustmentValue, { color: theme.colors.primary }]}>
                    {formatAdjustmentValue(value, adjustment.unit)}
                  </Text>
                </View>

                <View style={styles.adjustmentControls}>
                  <TouchableOpacity
                    accessibilityLabel={`Decrease ${adjustment.label}`}
                    onPress={() => nudgeAdjustment(adjustment.key, -adjustment.step)}
                    style={[styles.stepButton, { borderColor: theme.colors.border }]}
                  >
                    <Ionicons name="remove" size={18} color={theme.colors.text} />
                  </TouchableOpacity>

                  <View style={[styles.track, { backgroundColor: theme.colors.surfaceVariant }]}>
                    <View
                      style={[
                        styles.trackFill,
                        {
                          width: adjustmentPercent(value, adjustment.min, adjustment.max),
                          backgroundColor: theme.colors.primary,
                        },
                      ]}
                    />
                  </View>

                  <TouchableOpacity
                    accessibilityLabel={`Increase ${adjustment.label}`}
                    onPress={() => nudgeAdjustment(adjustment.key, adjustment.step)}
                    style={[styles.stepButton, { borderColor: theme.colors.border }]}
                  >
                    <Ionicons name="add" size={18} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
              </GlassCard>
            );
          })}
        </View>

        <GlassCard style={styles.stackPanel}>
          <View style={styles.stackHeader}>
            <View>
              <Text style={[styles.stackTitle, { color: theme.colors.text }]}>Edit stack</Text>
              <Text style={[styles.stackBody, { color: theme.colors.textSecondary }]}>
                Every operation stays reversible until export.
              </Text>
            </View>
            <Ionicons name="git-branch-outline" size={24} color={theme.colors.secondary} />
          </View>

          <View style={styles.stackList}>
            {(editStack.length > 0 ? editStack.slice(-3).reverse() : [{ type: 'filter', params: { preset: 'Ready' } }]).map(
              (operation, index) => (
                <View key={`${operation.type}-${index}`} style={styles.stackItem}>
                  <View style={[styles.stackDot, { backgroundColor: theme.colors.primary }]} />
                  <Text style={[styles.stackItemText, { color: theme.colors.textSecondary }]}>
                    {operation.type === 'filter'
                      ? operation.params.preset || 'Look adjustment'
                      : operation.type}
                  </Text>
                </View>
              )
            )}
          </View>
        </GlassCard>
      </ScrollView>

      <View style={[styles.actionBar, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          accessibilityLabel="Cancel editing"
          onPress={() => navigation.goBack()}
          disabled={isExporting}
          style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
        >
          <Ionicons name="close-outline" size={18} color={theme.colors.text} />
          <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel="Apply current look"
          onPress={handleApplyLook}
          disabled={isExporting}
          style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
        >
          <Ionicons name="checkmark" size={18} color="#090A0F" />
          <Text style={styles.primaryButtonText}>Apply look</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  doneButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    padding: 14,
    paddingBottom: 120,
    gap: 14,
  },
  previewShell: {
    height: 340,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  previewScrim: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  previewPill: {
    minHeight: 32,
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previewPillText: {
    fontSize: 12,
    fontWeight: '900',
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minHeight: 72,
    padding: 12,
    justifyContent: 'space-between',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  sectionHeader: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
  },
  sectionMeta: {
    fontSize: 12,
    fontWeight: '800',
  },
  textCommand: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  textCommandLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  filterRail: {
    gap: 10,
    paddingRight: 14,
  },
  filterCard: {
    width: 96,
    height: 94,
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    justifyContent: 'space-between',
  },
  filterSwatch: {
    height: 44,
    borderRadius: 6,
  },
  filterName: {
    fontSize: 12,
    fontWeight: '900',
  },
  adjustmentList: {
    gap: 10,
  },
  adjustmentCard: {
    padding: 12,
    gap: 12,
  },
  adjustmentTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  adjustmentLabelBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  adjustmentIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustmentLabel: {
    fontSize: 14,
    fontWeight: '900',
  },
  adjustmentValue: {
    fontSize: 13,
    fontWeight: '900',
  },
  adjustmentControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 8,
  },
  stackPanel: {
    padding: 14,
    gap: 12,
  },
  stackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  stackTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  stackBody: {
    maxWidth: 260,
    fontSize: 13,
    lineHeight: 18,
  },
  stackList: {
    gap: 8,
  },
  stackItem: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stackDot: {
    width: 7,
    height: 7,
    borderRadius: 7,
  },
  stackItemText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
  },
  secondaryButton: {
    flex: 0.9,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  primaryButton: {
    flex: 1.1,
    height: 46,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '900',
  },
  primaryButtonText: {
    color: '#090A0F',
    fontSize: 13,
    fontWeight: '900',
  },
});
