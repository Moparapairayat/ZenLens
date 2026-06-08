/**
 * Caption and Face Detection Stubs
 * Interfaces to on-device TFLite vision models
 */

/**
 * Image Captioning Interface
 * Generates natural language description of image content
 * @param imageUri - Local file URI to image
 * @returns Caption text or deterministic placeholder
 */
export async function runCaptionModel(imageUri: string): Promise<string> {
  try {
    // TODO: NATIVE BRIDGE IMPLEMENTATION
    // Replace with actual call to native TFLite caption model
    // Example (pseudo-code):
    // const result = await NativeModules.TFLiteCaption.runCaptionModel(imageUri);
    // return result.caption;

    // Deterministic placeholder captions based on URI
    const deterministically = generateDeterministicCaption(imageUri);
    console.log(`[STUB] Generated caption for ${imageUri}: "${deterministically}"`);
    return deterministically;
  } catch (error) {
    console.error('runCaptionModel error:', error);
    return 'A photograph';
  }
}

/**
 * Face Detection Interface
 * Extracts face embeddings and bounding boxes
 * @param imageUri - Local file URI to image
 * @returns Array of face regions with embeddings
 */
export async function runFaceEmbedding(
  imageUri: string
): Promise<
  Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    embedding: Float32Array;
    confidence: number;
  }>
> {
  try {
    // TODO: NATIVE BRIDGE IMPLEMENTATION
    // Replace with actual call to native TFLite face detection model
    // Example (pseudo-code):
    // const result = await NativeModules.TFLiteFace.runFaceEmbedding(imageUri);
    // return result.faces.map(f => ({
    //   x: f.x, y: f.y, width: f.width, height: f.height,
    //   embedding: new Float32Array(f.embedding),
    //   confidence: f.confidence
    // }));

    console.log(`[STUB] Face detection for ${imageUri}`);
    return [];
  } catch (error) {
    console.error('runFaceEmbedding error:', error);
    return [];
  }
}

/**
 * Generate deterministic caption for testing
 */
function generateDeterministicCaption(uri: string): string {
  let hash = 5381;
  for (let i = 0; i < uri.length; i++) {
    hash = (hash << 5) + hash + uri.charCodeAt(i);
  }

  const scenes = [
    'A vibrant outdoor landscape at sunset',
    'Portrait of a person in natural lighting',
    'Close-up nature photography with flowers',
    'Urban architecture and city scenes',
    'Still life arrangement of objects',
    'Abstract composition with geometric shapes',
    'Wildlife animal photography',
    'Aerial view of terrain and landscapes',
  ];

  const index = Math.abs(hash) % scenes.length;
  return scenes[index];
}

/**
 * Fallback heuristic tagger for when AI models unavailable
 * Uses basic image analysis and filename to generate tags
 */
export function getFallbackTags(imageUri: string, filename: string): string[] {
  const tags: Set<string> = new Set();

  // Extract tags from filename
  const nameParts = filename.toLowerCase().split(/[_\-\s.]/);
  const keywords: Record<string, string[]> = {
    photo: ['photo', 'pic', 'picture'],
    selfie: ['selfie', 'self'],
    nature: ['nature', 'landscape', 'outdoor', 'tree', 'flower', 'mountain'],
    portrait: ['portrait', 'person', 'people', 'face'],
    food: ['food', 'meal', 'drink', 'cake', 'pizza'],
    animal: ['animal', 'dog', 'cat', 'pet', 'bird'],
    urban: ['city', 'urban', 'street', 'building', 'architecture'],
    travel: ['travel', 'trip', 'vacation', 'beach', 'ocean'],
  };

  for (const [tag, keywords_list] of Object.entries(keywords)) {
    for (const keyword of keywords_list) {
      if (nameParts.some((part) => part.includes(keyword))) {
        tags.add(tag);
      }
    }
  }

  // Add default tags
  tags.add('photo');
  if (filename.includes('IMG')) tags.add('device-photo');
  if (filename.includes('selfie') || filename.includes('front')) tags.add('selfie');

  return Array.from(tags);
}
