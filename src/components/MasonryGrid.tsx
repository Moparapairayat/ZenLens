/**
 * Masonry Grid Component
 * Efficient multi-column grid layout for photos
 */
import React, { useMemo, useCallback } from 'react';
import { FlatList, View, StyleSheet, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SPACING = 2;
const COLUMN_WIDTH = (screenWidth - ITEM_SPACING * (COLUMN_COUNT - 1)) / COLUMN_COUNT;

interface MasonryGridProps {
  data: any[];
  renderItem: (props: { item: any; index: number }) => JSX.Element;
  keyExtractor: (item: any, index: number) => string;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  ListFooterComponent?: React.ComponentType<any> | null;
  scrollEnabled?: boolean;
}

/**
 * Arrange items into columns
 */
function arrangeIntoColumns(items: any[], columnCount: number): any[][] {
  const columns: any[][] = Array(columnCount)
    .fill(null)
    .map(() => []);

  items.forEach((item, index) => {
    columns[index % columnCount].push(item);
  });

  return columns;
}

/**
 * Column component
 */
function Column({ items, renderItem }: { items: any[]; renderItem: (props: any) => JSX.Element }) {
  return (
    <View style={styles.column}>
      {items.map((item, index) => (
        <View key={`${item.id}-${index}`} style={styles.columnItem}>
          {renderItem({ item, index })}
        </View>
      ))}
    </View>
  );
}

export default function MasonryGrid({
  data,
  renderItem,
  keyExtractor,
  onEndReached,
  onEndReachedThreshold = 0.1,
  ListFooterComponent,
  scrollEnabled = true,
}: MasonryGridProps): JSX.Element {
  /**
   * Arrange data into columns
   */
  const columns = useMemo(() => arrangeIntoColumns(data, COLUMN_COUNT), [data]);

  /**
   * Render columns
   */
  const renderContent = useCallback(() => {
    return (
      <View style={styles.container}>
        {columns.map((column, colIndex) => (
          <Column key={`col-${colIndex}`} items={column} renderItem={renderItem} />
        ))}
      </View>
    );
  }, [columns, renderItem]);

  return (
    <FlatList
      data={[{ id: 'masonry' }]} // Dummy data for FlatList
      renderItem={() => renderContent()}
      keyExtractor={() => 'masonry'}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      ListFooterComponent={ListFooterComponent}
      scrollEnabled={scrollEnabled}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: ITEM_SPACING,
    paddingHorizontal: ITEM_SPACING / 2,
  },
  column: {
    flex: 1,
    gap: ITEM_SPACING,
  },
  columnItem: {
    width: COLUMN_WIDTH,
    aspectRatio: 1,
  },
});
