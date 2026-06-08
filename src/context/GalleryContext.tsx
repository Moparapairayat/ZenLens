/**
 * Gallery Context
 * Manages media list, selection state, and gallery operations
 */
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface GalleryItem {
  id: string;
  uri: string;
  filename: string;
  width: number;
  height: number;
  createdAt: number;
  modifiedAt: number;
  thumbnailUri?: string;
  dominantColor?: string;
}

interface GalleryContextType {
  items: GalleryItem[];
  selectedItems: Set<string>;
  isLoading: boolean;
  error: string | null;
  setItems: (items: GalleryItem[]) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  removeItem: (id: string) => void;
}

const GalleryContext = createContext<GalleryContextType | undefined>(undefined);

/**
 * Gallery Provider Component
 */
export function GalleryProvider({ children }: { children: ReactNode }): JSX.Element {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleSelection = useCallback((id: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const value: GalleryContextType = {
    items,
    selectedItems,
    isLoading,
    error,
    setItems,
    toggleSelection,
    clearSelection,
    removeItem,
  };

  return <GalleryContext.Provider value={value}>{children}</GalleryContext.Provider>;
}

/**
 * Hook to access gallery context
 */
export function useGallery(): GalleryContextType {
  const context = useContext(GalleryContext);
  if (!context) {
    throw new Error('useGallery must be used within GalleryProvider');
  }
  return context;
}
