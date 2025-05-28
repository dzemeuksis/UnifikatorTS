import * as fuzz from 'fuzzball';
import jaroWinkler from 'jaro-winkler';

export type DistanceMetric = 'levenshtein' | 'jaro_winkler' | 'token_set_ratio';
export type ClusterLinkage = 'average' | 'single' | 'complete';
export type RepresentativeStrategy = 'medoid' | 'shortest' | 'longest' | 'first_alphabetical';

export interface UnifyOptions {
  distanceThreshold?: number;
  distanceMetric?: DistanceMetric;
  clusterLinkage?: ClusterLinkage;
  representativeStrategy?: RepresentativeStrategy;
  lowercase?: boolean;
  stripChars?: string;
  removeInternalChars?: string;
  minClusterSizeForRepresentationChange?: number;
  preprocessor?: (value: string) => string;
}

function escapeRegExp(s: string): string {
  return s.replace(/([-.*+?^${}()|[\]\\])/g, '\\$1');
}

function preprocessValue(
  original: string,
  lowercase: boolean,
  stripChars: string,
  removeInternalChars: string,
  preprocessor?: (value: string) => string
): string {
  let s = original;
  if (preprocessor) {
    s = preprocessor(s);
  }
  s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  if (lowercase) {
    s = s.toLowerCase();
  }
  const edgeRegex = new RegExp(
    `^[${escapeRegExp(stripChars)}]+|[${escapeRegExp(stripChars)}]+$`,
    'g'
  );
  s = s.replace(edgeRegex, '');
  const internalRegex = new RegExp(
    `[${escapeRegExp(removeInternalChars)}]`,
    'g'
  );
  s = s.replace(internalRegex, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function calculateDistanceMatrix(
  values: string[],
  metric: DistanceMetric
): number[][] {
  const n = values.length;
  const dist: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const s1 = values[i] || '';
      const s2 = values[j] || '';
      let d: number;
      if (!s1 && !s2) {
        d = 0;
      } else if (!s1 || !s2) {
        d = 1;
      } else if (metric === 'levenshtein') {
        const sim = fuzz.ratio(s1, s2) / 100;
        d = 1 - sim;
      } else if (metric === 'jaro_winkler') {
        const sim = jaroWinkler(s1, s2);
        d = 1 - sim;
      } else {
        const sim = fuzz.token_set_ratio(s1, s2) / 100;
        d = 1 - sim;
      }
      dist[i][j] = d;
      dist[j][i] = d;
    }
  }
  return dist;
}

function getClusterRepresentative(
  clusterValues: string[],
  indices: number[],
  strategy: RepresentativeStrategy,
  distMatrix: number[][]
): string {
  if (clusterValues.length === 0) {
    return '';
  }
  if (strategy === 'medoid') {
    if (clusterValues.length === 1) {
      return clusterValues[0];
    }
    let minSum = Infinity;
    let medoid = clusterValues[0];
    for (let i = 0; i < clusterValues.length; i++) {
      const idx1 = indices[i];
      const sum = indices.reduce(
        (acc, idx2) => acc + distMatrix[idx1][idx2],
        0
      );
      if (sum < minSum) {
        minSum = sum;
        medoid = clusterValues[i];
      }
    }
    return medoid;
  }
  if (strategy === 'shortest') {
    return [...clusterValues].sort(
      (a, b) => a.length - b.length || a.localeCompare(b)
    )[0];
  }
  if (strategy === 'longest') {
    return [...clusterValues].sort(
      (a, b) => b.length - a.length || a.localeCompare(b)
    )[0];
  }
  if (strategy === 'first_alphabetical') {
    return [...clusterValues].sort()[0];
  }
  return clusterValues[0];
}

export function unifyValuesAuto(
  valueList: string[],
  options: UnifyOptions = {}
): string[] {
  const {
    distanceThreshold = 0.35,
    distanceMetric = 'token_set_ratio',
    clusterLinkage = 'average',
    representativeStrategy = 'medoid',
    lowercase = true,
    stripChars = ' .-,()[]{}',
    removeInternalChars = '.,-()[]{}',
    minClusterSizeForRepresentationChange = 1,
    preprocessor,
  } = options;

  if (valueList.length === 0) {
    return [];
  }

  const processedKeys: string[] = [];
  const uniqueMap = new Map<string, string[]>();
  const EMPTY_KEY = '<EMPTY_PROCESSED>';

  for (const original of valueList) {
    const key =
      preprocessValue(
        original,
        lowercase,
        stripChars,
        removeInternalChars,
        preprocessor
      ) || EMPTY_KEY;
    processedKeys.push(key);
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, []);
    }
    if (!uniqueMap.get(key)!.includes(original)) {
      uniqueMap.get(key)!.push(original);
    }
  }

  const keys = Array.from(uniqueMap.keys())
    .filter(k => k !== EMPTY_KEY)
    .sort();
  if (keys.length === 0) {
    const rep = uniqueMap.get(EMPTY_KEY)![0] || '';
    return valueList.map(() => rep);
  }

  const distMatrix = calculateDistanceMatrix(keys, distanceMetric);

  let clusters: number[][] = keys.map((_, idx) => [idx]);
  while (true) {
    let minDist = Infinity;
    let pair: [number, number] = [-1, -1];
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const clusterA = clusters[i];
        const clusterB = clusters[j];
        let linkDist: number;
        if (clusterLinkage === 'single') {
          linkDist = Infinity;
          for (const a of clusterA) {
            for (const b of clusterB) {
              linkDist = Math.min(linkDist, distMatrix[a][b]);
            }
          }
        } else if (clusterLinkage === 'complete') {
          linkDist = -Infinity;
          for (const a of clusterA) {
            for (const b of clusterB) {
              linkDist = Math.max(linkDist, distMatrix[a][b]);
            }
          }
        } else {
          let sum = 0;
          let count = 0;
          for (const a of clusterA) {
            for (const b of clusterB) {
              sum += distMatrix[a][b];
              count++;
            }
          }
          linkDist = sum / count;
        }
        if (linkDist < minDist) {
          minDist = linkDist;
          pair = [i, j];
        }
      }
    }
    if (minDist <= distanceThreshold && pair[0] >= 0) {
      const [i, j] = pair;
      const merged = clusters[i].concat(clusters[j]);
      clusters = clusters.filter((_, idx) => idx !== i && idx !== j);
      clusters.push(merged);
    } else {
      break;
    }
  }

  const replacement = new Map<string, string>();
  for (const clusterIndices of clusters) {
    const clusterKeys = clusterIndices.map(i => keys[i]);
    if (clusterKeys.length < minClusterSizeForRepresentationChange) {
      for (const k of clusterKeys) {
        replacement.set(k, k);
      }
    } else {
      const repKey = getClusterRepresentative(
        clusterKeys,
        clusterIndices,
        representativeStrategy,
        distMatrix
      );
      for (const k of clusterKeys) {
        replacement.set(k, repKey);
      }
    }
  }
  if (uniqueMap.has(EMPTY_KEY)) {
    replacement.set(EMPTY_KEY, uniqueMap.get(EMPTY_KEY)![0]);
  }

  return processedKeys.map(key => {
    const repKey = replacement.get(key) ?? key;
    const origs = uniqueMap.get(repKey) || uniqueMap.get(key) || [];
    return origs[0] ?? (repKey === EMPTY_KEY ? '' : repKey);
  });
}