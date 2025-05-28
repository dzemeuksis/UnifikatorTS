# Unifikator

Unifikator is a web-based tool for clustering and unifying similar text values. It uses fuzzy string matching and agglomerative clustering to group related entries and select a representative value for each group.

## Getting Started

### Prerequisites

- Node.js (version ≥ 14)
- npm

### Installation

```bash
git clone <repository-url>
cd UnifikatorTS
npm install
```

### Running the App

```bash
npm run dev
```

Open http://localhost:5173 in your browser to access the application.

## How It Works

1. **Input**: Paste one value per line into the **Values** panel.
2. **Preprocessing**: Optionally apply a custom JavaScript function, normalize Unicode, remove diacritics, convert to lowercase, strip specified edge characters, remove specified internal characters, and collapse whitespace.
3. **Distance Computation**: Compute pairwise distances between processed strings using the selected distance metric.
4. **Clustering**: Perform agglomerative clustering with the chosen linkage method and distance threshold.
5. **Representative Selection**: For each cluster, pick a representative string based on the selected strategy (if cluster size ≥ minimum); otherwise keep the original.
6. **Output**: The **Result** panel shows one unified value per input line in the same order.

## Controls

### Distance threshold (`distanceThreshold`)

- **Default:** `0.35`
- **Type:** `number` (range 0–1)
- **Description:** Maximum cluster distance. Lower values enforce stricter matching (only very similar strings cluster); higher values allow looser grouping.
- **Use case:** Set a low threshold (e.g. 0.1–0.2) for near-exact matches; increase (e.g. 0.4–0.6) to group more variants.

### Distance metric (`distanceMetric`)

- **Default:** `token_set_ratio`
- **Options:** `levenshtein`, `jaro_winkler`, `token_set_ratio`
- **Description:** Method for computing string similarity:
  - `levenshtein`: classic edit distance ratio
  - `jaro_winkler`: gives extra weight to common prefixes
  - `token_set_ratio`: ignores word order and duplicates (good for multi-word inputs)
- **Use case:** Use `token_set_ratio` for multi-word values with varying order; `jaro_winkler` when prefixes matter; `levenshtein` for simple character-level edits.

### Cluster linkage (`clusterLinkage`)

- **Default:** `average`
- **Options:** `average`, `single`, `complete`
- **Description:** How to compute distance between clusters:
  - `average`: mean of all pairwise distances
  - `single`: minimum distance (can produce chaining)
  - `complete`: maximum distance (yields tight, compact clusters)
- **Use case:** `average` for balanced clusters; `single` to link clusters via the closest members; `complete` for strict grouping.

### Representative strategy (`representativeStrategy`)

- **Default:** `medoid`
- **Options:** `medoid`, `shortest`, `longest`, `first_alphabetical`
- **Description:** How to select a representative string for each cluster:
  - `medoid`: element with minimal total distance to others (most central)
  - `shortest`: shortest string (prefer brevity)
  - `longest`: longest string (prefer descriptive text)
  - `first_alphabetical`: lexicographically first
- **Use case:** `medoid` for a central choice; `shortest`/`longest` when length matters; `first_alphabetical` for deterministic ordering.

### Lowercase (`lowercase`)

- **Default:** enabled
- **Type:** `boolean`
- **Description:** Convert values to lowercase before other processing to avoid case mismatches.
- **Use case:** Disable if case differences carry semantic meaning.

### Strip characters (edges) (`stripChars`)

- **Default:** ` .-,()[]{}`
- **Type:** `string`
- **Description:** Characters to trim from the beginning and end of each value (e.g. punctuation, spaces).
- **Use case:** Remove surrounding quotes, punctuation or brackets before comparison.

### Remove internal characters (`removeInternalChars`)

- **Default:** `.,-()[]{}`
- **Type:** `string`
- **Description:** Characters to remove anywhere inside values.
- **Use case:** Eliminate internal punctuation or separators to focus on alphanumeric content.

### Minimum cluster size for representation change (`minClusterSize`)

- **Default:** `1`
- **Type:** `integer`
- **Description:** Minimum cluster size required to apply the representative strategy. Clusters smaller than this keep their processed value unchanged.
- **Use case:** Set ≥2 to leave singleton clusters untouched.

### Preprocessor JS code (`preprocessorCode`)

- **Default:** _none_
- **Type:** JavaScript arrow function (`(value) => string`)
- **Description:** Custom preprocessing function applied before normalization. E.g. `x => x.replace(/^#/, '')`.
- **Use case:** Strip specific prefixes, map synonyms, or perform any custom cleanup.
- **Warning:** Runs via `eval` in the browser—only use trusted code.
