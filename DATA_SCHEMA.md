# DATA_SCHEMA.md

# DESIRE PATH Data Schema

This document defines the canonical data model for DESIRE PATH.

The schema is implementation-independent. While the current project uses QGIS and GeoPackage as its primary data store, these concepts should remain stable regardless of future storage format.

The fundamental unit of the project is an **Encounter**.

---

# Encounter

Each encounter represents a single point of entry into the cartography.

An encounter may consist of one or more media objects and occupies one position within each of the project's dimensions.

---

## Identity

### `id`

Unique identifier.

Example:

```text
E001
```

This identifier should never change once assigned.

---

### `title`

Human-readable title.

Example:

```text
The Sound of Cicadas
```

Titles are not required to be unique.

---

# Spatial (Where)

## `sp_geometry`

Possible values:

- `POINT`
- `ROUTE`
- `AREA`
- `MULTIPLE`
- `NONE`

Describes the geometric form of the encounter.

---

## `sp_location`

The encounter's public geographic geometry.

Depending on `sp_geometry`, this may be:

- point
- line
- polygon
- multi-geometry
- null

Private geometries should never be committed to this repository.

---

## `sp_status`

Possible values:

- `PRECISE`
- `APPROXIMATE`
- `RECONSTRUCTED`
- `WITHHELD`
- `UNLOCATABLE`

Describes the relationship between the encounter and its geographic representation.

---

# Temporal (When)

## `tm_position`

Possible values:

- `DISTANT_PAST`
- `RECENT_PAST`
- `PRESENT`
- `NEAR_FUTURE`
- `DISTANT_FUTURE`
- `INDETERMINATE`
- `ATEMPORAL`

---

## `tm_extent`

Possible values:

- `MOMENTARY`
- `DURATIONAL`
- `ONGOING`

---

## `tm_form_primary`

Possible values:

- `LINEAR`
- `CYCLICAL`
- `RECURSIVE`
- `COMPOSITE`
- `ANACHRONIC`

---

## `tm_form_secondary`

Optional.

Uses the same vocabulary as `tm_form_primary`.

---

# Affective (Feeling)

## `af_intensity`

Continuous value.

Range:

```text
0.0 → 1.0
```

Where:

- 0.0 = barely perceptible
- 1.0 = overwhelming

---

## `af_primary`

Possible values:

- `JOY`
- `TENDERNESS`
- `DESIRE`
- `WONDER`
- `SERENITY`
- `NOSTALGIA`
- `MELANCHOLY`
- `GRIEF`
- `LONELINESS`
- `ANXIETY`
- `FEAR`
- `ANGER`
- `DISGUST`
- `ESTRANGEMENT`
- `EERINESS`
- `NUMBNESS`
- `AMBIVALENCE`

---

## `af_secondary`

Optional.

Uses the same vocabulary.

---

# Knowing

## `kn_primary`

Possible values:

- `WITNESSED`
- `REMEMBERED`
- `INHERITED`
- `DOCUMENTED`
- `DREAMED`
- `IMAGINED`
- `ANTICIPATED`
- `INFERRED`
- `GENERATED`
- `UNRESOLVED`

---

## `kn_secondary`

Optional.

Uses the same vocabulary.

---

# Media

Each encounter may contain any number of media objects.

Media are stored separately from the encounter itself.

An encounter is not limited to a single medium.

Examples include:

- text
- image
- audio
- video
- drawing
- map
- scan
- website
- document

Future implementations may support additional media types.

---

# QGIS Implementation

The current QGIS layer contains one feature per encounter.

Each feature contains:

| Field | Type |
|--------|------|
| id | Text |
| title | Text |
| sp_geometry | Text |
| sp_status | Text |
| tm_position | Text |
| tm_extent | Text |
| tm_form_primary | Text |
| tm_form_secondary | Text |
| af_intensity | Decimal |
| af_primary | Text |
| af_secondary | Text |
| kn_primary | Text |
| kn_secondary | Text |

The feature geometry stores `sp_location`.

For web display, every encounter must also have a stable representative point. Point encounters use their geometry directly. Routes, areas, and multiple geometries use a representative point authored in QGIS rather than an automatically exposed private centroid. Encounters with `WITHHELD` or `UNLOCATABLE` status must use an intentionally generalized public point or remain absent from public exports.

---

# Public Export

The website consumes derived GeoJSON and JSON files exported from the authoritative QGIS project. Each export includes a schema version. Generated files may be replaced without changing application code as long as the versioned contract remains compatible.

Missing dimensional values are validation errors in the first prototype. They are never silently converted to maximum distance.

---

# Media Object

Public media are listed on an encounter in display order. Each media object contains:

| Field | Type | Purpose |
|-------|------|---------|
| type | Text | `text`, `image`, `audio`, or `video` |
| src | Text or null | Relative public asset path for file-based media |
| text | Text or null | Inline text for textual media |
| caption | Text or null | Optional quiet contextual caption |
| alt | Text or null | Required text alternative for informative images |

Media paths must be relative. A public export must never reference private or local-only files.

---

# Future Crowdsourced Implementation

The logical schema should remain stable even if encounters are submitted through a web form.

The form should not expose backend terminology directly.

Instead, it should translate human-readable questions into the fields defined above.

The backend schema should therefore remain independent of the user interface.

---

# Design Principles

Every field should satisfy the following criteria:

1. It represents a meaningful coordinate along which encounters may become adjacent.

2. It can be understood independently of every other field.

3. It can be extended without breaking existing data.

4. It contributes to navigation rather than merely describing metadata.

Fields that do not participate in the cartography should be considered metadata rather than dimensions and should remain outside the core schema.
