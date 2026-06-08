/**
 * Color Extraction Utilities
 * Extract dominant colors from images for dynamic UI theming
 */

export interface ColorPalette {
  dominant: string;
  vibrant: string;
  muted: string;
  lightVibrant: string;
  darkVibrant: string;
  lightMuted: string;
  darkMuted: string;
}

/**
 * Extract dominant color from URI or data
 * Simplified implementation - production should use native canvas or image processing
 */
export function extractDominantColor(imageUri: string): Promise<string> {
  // TODO: Implement actual image analysis
  // Option 1: Use native module to decode image and analyze pixels
  // Option 2: Use web canvas if available
  // Option 3: Use ML Kit for advanced color analysis

  return new Promise((resolve) => {
    // Deterministic color generation for now
    let hash = 0;
    for (let i = 0; i < imageUri.length; i++) {
      const char = imageUri.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    // Generate hex color from hash
    const hue = Math.abs(hash % 360);
    const saturation = 60 + (Math.abs(hash / 360) % 40);
    const lightness = 50 + (Math.abs(hash / 720) % 20);

    const color = hslToHex(hue, saturation, lightness);
    resolve(color);
  });
}

/**
 * Generate full color palette from dominant color
 */
export function generateColorPalette(dominantColor: string): ColorPalette {
  const rgb = hexToRgb(dominantColor);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

  return {
    dominant: dominantColor,
    vibrant: hslToHex(hsl.h, 100, 50),
    muted: hslToHex(hsl.h, 30, 60),
    lightVibrant: hslToHex(hsl.h, 100, 70),
    darkVibrant: hslToHex(hsl.h, 100, 30),
    lightMuted: hslToHex(hsl.h, 30, 80),
    darkMuted: hslToHex(hsl.h, 30, 40),
  };
}

/**
 * Convert HSL to hex color
 */
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Convert hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Check if color is light or dark
 */
export function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 155;
}

/**
 * Get contrasting text color (black or white)
 */
export function getContrastingTextColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? '#000000' : '#FFFFFF';
}
