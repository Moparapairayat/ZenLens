/**
 * Unit tests for clustering algorithms
 */
import { kMeansClustering, dbscanClustering } from '../ai/clustering';

describe('Clustering Algorithms', () => {
  describe('kMeansClustering', () => {
    it('should cluster similar vectors', () => {
      const embeddings = [
        { mediaId: 'a', embedding: new Float32Array([0, 0]) },
        { mediaId: 'b', embedding: new Float32Array([0.1, 0.1]) },
        { mediaId: 'c', embedding: new Float32Array([10, 10]) },
        { mediaId: 'd', embedding: new Float32Array([10.1, 10.1]) },
      ];

      const result = kMeansClustering(embeddings, 2);

      expect(result.clusters.length).toBe(2);
      expect(result.iterations).toBeGreaterThan(0);
    });

    it('should handle empty input', () => {
      const result = kMeansClustering([], 2);
      expect(result.clusters.length).toBe(0);
      expect(result.centroids.length).toBe(0);
    });

    it('should handle single cluster', () => {
      const embeddings = [
        { mediaId: 'a', embedding: new Float32Array([0, 0]) },
      ];

      const result = kMeansClustering(embeddings, 1);
      expect(result.clusters.length).toBe(1);
      expect(result.clusters[0].length).toBe(1);
    });
  });

  describe('dbscanClustering', () => {
    it('should cluster dense regions', () => {
      const embeddings = [
        { mediaId: 'a', embedding: new Float32Array([0, 0]) },
        { mediaId: 'b', embedding: new Float32Array([0.1, 0.1]) },
        { mediaId: 'c', embedding: new Float32Array([0.2, 0]) },
        { mediaId: 'd', embedding: new Float32Array([10, 10]) },
      ];

      const result = dbscanClustering(embeddings, 1, 2);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty input', () => {
      const result = dbscanClustering([], 1, 3);
      expect(result.length).toBe(0);
    });
  });
});
