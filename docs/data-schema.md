# DESIRE PATH Data Schema

This document defines the canonical data model for DESIRE PATH. QGIS and its GeoPackage are the authoritative encounter store; the website reads generated public files.

The fundamental unit is an **Encounter**.

## Encounter

Each encounter has these fields:

| Field | Type | Purpose |
|---|---|---|
| `id` | Text | Stable unique identifier, such as `E001` |
| `title` | Text | Human-readable title |
| `placeholder` | Boolean | Marks temporary sample content |
| `place` | Number pair | Public `[longitude, latitude]` location |
| `time` | Text | Time category |
| `feeling` | Text | Feeling category |
| `knowing` | Text | Knowing category |
| `media` | JSON array | Ordered encounter content |

An identifier must never change once assigned. Titles do not need to be unique.

QGIS geometry is converted to `place` during public export. Every committed coordinate is public. Private coordinates must be generalized, displaced, or omitted before they enter this repository.

## Time

`time` accepts:

- `DISTANT_PAST`
- `RECENT_PAST`
- `PRESENT`
- `NEAR_FUTURE`
- `DISTANT_FUTURE`
- `INDETERMINATE`
- `ATEMPORAL`

## Feeling

`feeling` accepts:

- `JOY`
- `DESIRE`
- `WONDER`
- `NOSTALGIA`
- `GRIEF`
- `FEAR`
- `ANGER`

`data/feeling-distances.json` contains all 21 unique pairwise distances between Feeling categories in the canonical order shown above. As in every other dimension, `0` is nearest and `1` is farthest. Identical types use the configured `identical` value. The provisional semantic values consider valence, activation, and relational orientation, with editorial adjustments where those broad qualities would collapse distinct affect families. They remain placeholders intended for later revision.

## Knowing

`knowing` accepts:

- `WITNESSED`
- `REMEMBERED`
- `INHERITED`
- `DOCUMENTED`
- `DREAMED`
- `IMAGINED`
- `UNRESOLVED`

`data/knowing-distances.json` contains all 21 unique pairwise distances between ways of knowing in the canonical order shown above. Values consider directness of evidence, transmission, construction, and temporal orientation. They use the same `0`-nearest and `1`-farthest convention and remain placeholders intended for later revision.

## Media

An encounter may contain any number of media objects in display order. The four supported types are:

- `text`
- `image`
- `audio`
- `video`

Media objects use only the fields relevant to their type:

| Field | Purpose |
|---|---|
| `type` | One of the four supported types |
| `src` | Safe relative path for image, audio, or video |
| `text` | Inline content for text media |
| `caption` | Optional contextual caption |
| `alt` | Required alternative text for informative images |

Media paths must be relative and must resolve to committed public files. Real media should be grouped by encounter ID under `media/`.

## Distance model

During export, the navigation generator derives four normalized pairwise distances:

- **Place:** great-circle distance between public `place` coordinates, divided by the greatest pairwise Place distance in the export.
- **Time:** ordinal distance between `time` values.
- **Feeling:** configured distance using `data/feeling-distances.json`.
- **Knowing:** configured distance using `data/knowing-distances.json`.

The pairwise distances are an intermediate analytical model and are not published to the browser. Missing values fail validation rather than being silently interpreted as maximum distance.

## Generated navigation

`data/navigation.json` contains precomputed neighborhoods for all 15 non-empty combinations of Place, Time, Feeling, and Knowing. Each combination contains its global threshold and a 3–4 encounter neighborhood for every encounter. Neighborhood entries preserve ordering, rounded composite distance, and bridge status.

The file also contains the union of paths that can become traversable. Each possible path records whether it appears from one endpoint or both and the individual dimensions in which the pair falls within the global nearness threshold. The browser uses this metadata for the optional debugging view without recalculating the global graph.

## Public files

- `data/encounters.json` is the generated public encounter and media export.
- `data/navigation.json` contains every generated neighborhood graph and possible debugging path.
- `data/feeling-distances.json` contains authored provisional Feeling distances.
- `data/knowing-distances.json` contains authored provisional Knowing distances.
- `data/settings.json` contains authored presentation and neighborhood settings.

All versioned public files use `schema_version: 5`.
