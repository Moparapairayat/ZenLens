/**
 * Clustering Algorithms for Smart Albums
 * K-Means and DBSCAN for automatic album generation
 */

/**
 * K-Means clustering result
 */
export interface KMeansResult {
  clusters: number[][]; // Array of cluster arrays containing media IDs
  centroids: Float32Array[];
  iterations: number;
}

/**
 * K-Means clustering implementation
 * Groups similar embeddings into K clusters
 * @param embeddings - Array of embeddings with media IDs
 * @param k - Number of clusters
 * @param maxIterations - Maximum iterations
 * @returns Clustering result with cluster assignments
 */
export function kMeansClustering(
  embeddings: Array<{ mediaId: string; embedding: Float32Array }>,
  k: number,
  maxIterations: number = 100
): KMeansResult {
  if (embeddings.length === 0) {
    return { clusters: [], centroids: [], iterations: 0 };
  }

  const n = embeddings.length;
  const d = embeddings[0].embedding.length;

  // Initialize centroids randomly from data points
  const centroidIndices = new Set<number>();
  while (centroidIndices.size < Math.min(k, n)) {
    centroidIndices.add(Math.floor(Math.random() * n));
  }
  let centroids: Float32Array[] = Array.from(centroidIndices).map(
    (i) => new Float32Array(embeddings[i].embedding)
  );

  let assignments = new Array(n);
  let iterations = 0;

  for (iterations = 0; iterations < maxIterations; iterations++) {
    // Assign points to nearest centroid
    const newAssignments = new Array(n);
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let assignment = 0;

      for (let j = 0; j < centroids.length; j++) {
        const dist = euclideanDistance(embeddings[i].embedding, centroids[j]);
        if (dist < minDist) {
          minDist = dist;
          assignment = j;
        }
      }
      newAssignments[i] = assignment;
    }

    // Check convergence
    if (arraysEqual(assignments, newAssignments)) {
      assignments = newAssignments;
      break;
    }
    assignments = newAssignments;

    // Update centroids
    const newCentroids = Array(centroids.length)
      .fill(null)
      .map(() => new Float32Array(d));
    const counts = new Array(centroids.length).fill(0);

    for (let i = 0; i < n; i++) {
      const clusterIdx = assignments[i];
      for (let j = 0; j < d; j++) {
        newCentroids[clusterIdx][j] += embeddings[i].embedding[j];
      }
      counts[clusterIdx]++;
    }

    // Normalize centroids
    for (let j = 0; j < centroids.length; j++) {
      if (counts[j] > 0) {
        for (let i = 0; i < d; i++) {
          newCentroids[j][i] /= counts[j];
        }
      }
    }
    centroids = newCentroids;
  }

  // Build clusters
  const clusters: number[][] = Array(centroids.length)
    .fill(null)
    .map(() => []);
  for (let i = 0; i < n; i++) {
    const mediaId = embeddings[i].mediaId;
    clusters[assignments[i]].push(i);
  }

  return {
    clusters: clusters.filter((c) => c.length > 0),
    centroids,
    iterations,
  };
}

/**
 * DBSCAN clustering
 * Density-based clustering for automatic grouping
 * @param embeddings - Array of embeddings with media IDs
 * @param eps - Maximum distance between points in cluster
 * @param minPoints - Minimum points to form cluster
 * @returns Array of clusters
 */
export function dbscanClustering(
  embeddings: Array<{ mediaId: string; embedding: Float32Array }>,
  eps: number = 0.5,
  minPoints: number = 3
): number[][] {
  const n = embeddings.length;
  const visited = new Array(n).fill(false);
  const clusters: number[][] = [];
  const noise: number[] = [];

  const getNeighbors = (idx: number): number[] => {
    const neighbors: number[] = [];
    for (let i = 0; i < n; i++) {
      if (i !== idx) {
        const dist = euclideanDistance(embeddings[idx].embedding, embeddings[i].embedding);
        if (dist <= eps) {
          neighbors.push(i);
        }
      }
    }
    return neighbors;
  };

  for (let i = 0; i < n; i++) {
    if (visited[i]) continue;

    const neighbors = getNeighbors(i);

    if (neighbors.length < minPoints) {
      noise.push(i);
      visited[i] = true;
      continue;
    }

    // Start new cluster
    const cluster: number[] = [i];
    visited[i] = true;

    let queue = [...neighbors];
    while (queue.length > 0) {
      const point = queue.shift()!;

      if (visited[point]) continue;
      visited[point] = true;
      cluster.push(point);

      const pointNeighbors = getNeighbors(point);
      if (pointNeighbors.length >= minPoints) {
        queue = queue.concat(pointNeighbors.filter((n) => !visited[n]));
      }
    }

    if (cluster.length >= minPoints) {
      clusters.push(cluster);
    }
  }

  return clusters;
}

/**
 * Euclidean distance between vectors
 */
function euclideanDistance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Check if arrays are equal
 */
function arraysEqual(a: any[], b: any[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
