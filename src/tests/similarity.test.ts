/**
 * Unit tests for similarity functions
 */
import {
  cosineSimilarity,
  findTopNSimilar,
  euclideanDistance,
  l2Norm,
  normalizeEmbedding,
} from '../../ai/similarity';

describe('Similarity Functions', () => {
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const v1 = new Float32Array([1, 0, 0]);
      const v2 = new Float32Array([1, 0, 0]);
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(1, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const v1 = new Float32Array([1, 0, 0]);
      const v2 = new Float32Array([0, 1, 0]);
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(0, 5);
    });

    it('should return -1 for opposite vectors', () => {
      const v1 = new Float32Array([1, 0, 0]);
      const v2 = new Float32Array([-1, 0, 0]);
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(-1, 5);
    });

    it('should throw error for mismatched dimensions', () => {
      const v1 = new Float32Array([1, 0]);
      const v2 = new Float32Array([1, 0, 0]);
      expect(() => cosineSimilarity(v1, v2)).toThrow();
    });
  });

  describe('euclideanDistance', () => {
    it('should return 0 for identical vectors', () => {
      const v1 = new Float32Array([1, 2, 3]);
      const v2 = new Float32Array([1, 2, 3]);
      expect(euclideanDistance(v1, v2)).toBeCloseTo(0, 5);
    });

    it('should compute correct distance', () => {
      const v1 = new Float32Array([0, 0, 0]);
      const v2 = new Float32Array([3, 4, 0]);
      expect(euclideanDistance(v1, v2)).toBeCloseTo(5, 5);
    });
  });

  describe('l2Norm', () => {
    it('should compute correct norm', () => {
      const v = new Float32Array([3, 4]);
      expect(l2Norm(v)).toBeCloseTo(5, 5);
    });

    it('should return 0 for zero vector', () => {
      const v = new Float32Array([0, 0, 0]);
      expect(l2Norm(v)).toBe(0);
    });
  });

  describe('normalizeEmbedding', () => {
    it('should normalize to unit length', () => {
      const v = new Float32Array([3, 4]);
      const normalized = normalizeEmbedding(v);
      expect(l2Norm(normalized)).toBeCloseTo(1, 5);
    });

    it('should handle zero vector', () => {
      const v = new Float32Array([0, 0]);
      const normalized = normalizeEmbedding(v);
      expect(l2Norm(normalized)).toBe(0);
    });
  });

  describe('findTopNSimilar', () => {
    it('should return top N results sorted by score', () => {
      const query = new Float32Array([1, 0, 0]);
      const candidates = [
        { mediaId: 'a', embedding: new Float32Array([1, 0, 0]) },
        { mediaId: 'b', embedding: new Float32Array([0, 1, 0]) },
        { mediaId: 'c', embedding: new Float32Array([0.5, 0.5, 0]) },
      ];

      const results = findTopNSimilar(query, candidates, 2);

      expect(results.length).toBe(2);
      expect(results[0].mediaId).toBe('a');
      expect(results[0].score).toBeGreaterThan(results[1].score);
    });

    it('should handle empty candidates', () => {
      const query = new Float32Array([1, 0, 0]);
      const results = findTopNSimilar(query, [], 10);
      expect(results.length).toBe(0);
    });
  });
});
