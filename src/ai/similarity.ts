/**
 * Similarity and Search Functions
 * Cosine similarity for embedding-based search
 */

/**
 * Compute cosine similarity between two vectors
 * @param a - First vector
 * @param b - Second vector
 * @returns Cosine similarity in range [-1, 1]
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Result from similarity search
 */
export interface SimilarityResult {
  mediaId: string;
  score: number;
  embedding?: Float32Array;
}

/**
 * Find top N most similar embeddings
 * @param queryEmbedding - Query vector
 * @param candidates - Array of candidate embeddings with media IDs
 * @param topN - Number of results to return
 * @returns Top N most similar results
 */
export function findTopNSimilar(
  queryEmbedding: Float32Array,
  candidates: Array<{ mediaId: string; embedding: Float32Array }>,
  topN: number = 10
): SimilarityResult[] {
  const scores = candidates
    .map((candidate) => ({
      mediaId: candidate.mediaId,
      score: cosineSimilarity(queryEmbedding, candidate.embedding),
      embedding: candidate.embedding,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return scores;
}

/**
 * Batch compute similarities for efficiency
 */
export function batchCosineSimilarity(
  queryEmbedding: Float32Array,
  embeddings: Float32Array[]
): number[] {
  return embeddings.map((emb) => cosineSimilarity(queryEmbedding, emb));
}

/**
 * Euclidean distance (alternative metric)
 */
export function euclideanDistance(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have same dimensions');
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * L2 norm (magnitude) of vector
 */
export function l2Norm(vector: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < vector.length; i++) {
    sum += vector[i] * vector[i];
  }
  return Math.sqrt(sum);
}

/**
 * Normalize vector to unit length
 */
export function normalizeEmbedding(embedding: Float32Array): Float32Array {
  const norm = l2Norm(embedding);
  if (norm === 0) return new Float32Array(embedding.length);

  const normalized = new Float32Array(embedding.length);
  for (let i = 0; i < embedding.length; i++) {
    normalized[i] = embedding[i] / norm;
  }
  return normalized;
}
