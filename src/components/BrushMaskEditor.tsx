/**
 * Brush Mask Editor Component
 * Paint mask for non-destructive selective editing
 */
import React, { useRef, useState } from 'react';
import { View, StyleSheet, PanResponder, GestureResponderEvent } from 'react-native';
import { Canvas, Group } from '@shopify/react-native-skia';

interface BrushMaskEditorProps {
  uri: string;
  onMaskChange?: (maskPath: any) => void;
  brushSize?: number;
  opacity?: number;
}

export default function BrushMaskEditor({
  uri,
  onMaskChange,
  brushSize = 30,
  opacity = 0.5,
}: BrushMaskEditorProps): JSX.Element {
  const [isDrawing, setIsDrawing] = useState(false);
  const pathRef = useRef<string>('');

  /**
   * Pan responder for touch tracking
   */
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        setIsDrawing(true);
        const { locationX, locationY } = evt.nativeEvent;
        const x = locationX;
        const y = locationY;
        pathRef.current = `M${x} ${y}`;
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        if (isDrawing) {
          const { locationX, locationY } = evt.nativeEvent;
          const x = locationX;
          const y = locationY;
          pathRef.current += ` L${x} ${y}`;
        }
      },
      onPanResponderRelease: () => {
        setIsDrawing(false);
        onMaskChange?.(pathRef.current);
      },
    })
  ).current;

  return (
    <View
      style={styles.container}
      {...panResponder.panHandlers}
    >
      <Canvas style={styles.canvas}>
        <Group opacity={opacity} />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  canvas: {
    flex: 1,
  },
});
