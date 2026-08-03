# Decision log

# DESIRE PATH Decision Log

This document records significant conceptual, architectural, and design decisions made throughout the development of DESIRE PATH.

It serves as the project's institutional memory.

Unlike the specification documents, this file is expected to evolve continuously.

---

# Purpose

Whenever a significant decision is made, record:

- what was decided,
- why it was decided,
- what alternatives were considered,
- and how the decision affects future work.

This document exists to preserve reasoning rather than implementation details.

Future contributors should consult this file before revisiting major design decisions.

---

# What Belongs Here

Examples include:

- conceptual changes
- navigation changes
- data model revisions
- terminology revisions
- architectural decisions
- major visual redesigns
- changes to interaction philosophy

Do not record:

- bug fixes
- refactoring
- formatting changes
- dependency updates
- minor implementation details

---

# Entry Format

Each decision should use the following structure.

---

## YYYY-MM-DD

### Decision

A concise description of what changed.

### Reasoning

Why this decision was made.

### Alternatives Considered

Briefly summarize the alternatives that were discussed.

### Implications

Describe how this decision affects future development.

---

# Notes

This document is intentionally cumulative.

Earlier decisions should not be rewritten unless they are superseded.

If a decision changes, add a new entry explaining why the previous decision was revised.

The evolution of the project's thinking is itself part of the project's history.

---

# Initial Decisions

## 2026-08-03

### Decision

Feeling and Knowing each use seven categories. Feeling retains Joy, Desire, Wonder, Nostalgia, Grief, Fear, and Anger. Knowing retains Witnessed, Remembered, Inherited, Documented, Dreamed, Imagined, and Unresolved. Existing placeholder encounters are migrated into the nearest retained editorial category.

### Reasoning

The earlier vocabularies offered more distinctions than the developing archive requires. A smaller set makes authoring more deliberate while preserving meaningful variation across both dimensions.

### Alternatives Considered

- Keeping all 18 Feeling and 10 Knowing categories.
- Reducing only one dimension.
- Replacing the categories with numerical scales.

### Implications

This introduces public schema version 4. Each authored distance table contains 21 unique pairs. The QGIS form, authoritative encounters, public exports, validator, tests, and documentation use the reduced vocabularies.

---

## 2026-08-01

### Decision

The collapsed Debug panel becomes Options. Its controls use visitor-facing Encounter language, and current Encounter information is presented as concise labeled details instead of raw JSON. Distance comparison is removed from the public interface.

### Reasoning

These views are useful for exploration as well as development. Presenting them as diagnostics unnecessarily exposes implementation framing and makes otherwise meaningful information harder to interpret.

### Implications

Options remains collapsed by default. Optional context stays visually subordinate, and the ordinary map never reveals the complete path network. The sidebar content scrolls independently, while Retrace remains visible in a separate footer.

---

## 2026-08-01

### Decision

The public encounter schema uses the plain sibling fields `place`, `time`, `feeling`, and `knowing`. QGIS retains point geometry for authoring, while export converts it to `place: [longitude, latitude]`. The public encounter collection is plain JSON rather than GeoJSON, avoiding duplicate geometry while giving all four navigational dimensions the same structural level. `affect-distances.json` is renamed `feeling-distances.json` to match public terminology.

### Reasoning

The public data now mirrors the language and conceptual symmetry of the interface. Keeping GeoJSON geometry alongside a `place` property would duplicate public coordinates and create two possible sources of truth.

### Alternatives Considered

- Retaining backend-prefixed field names in public data.
- Duplicating coordinates in both GeoJSON geometry and a `place` property.
- Keeping the Feeling configuration under the term Affect.

### Implications

This introduces public schema version 3. QGIS geometry remains authoritative, while the browser, distance generator, validator, and Options panel consume the simplified JSON record.

---

## 2026-08-01

### Decision

The encounter schema uses one coordinate for each navigational dimension: public point geometry for Place, `tm_position` for Time, `af_primary` for Feeling, and `kn_primary` for Knowing. Earlier spatial descriptors, temporal extent and form, affect intensity and secondary affect, and secondary knowing are removed.

Feeling and Knowing use provisional authored semantic distances between their categorical values. Like every other dimension, `0` is nearest and `1` is farthest. Identical categories use zero and different categories use their configured pairwise distance. Supported media types are limited to text, image, audio, and video.

### Reasoning

Every retained dimensional field now has a direct, legible effect on generated paths. The placeholder Feeling relationships preserve variation without requiring unused secondary fields or intensity values.

### Alternatives Considered

- Retaining descriptive fields that did not affect navigation.
- Treating all different affects as equally distant.
- Supporting media types without corresponding browser renderers.

### Implications

This introduces public schema version 2. Affect and Knowing distances remain provisional and must be revisited with the final content. QGIS stores only retained encounter fields, and generated exports reject removed fields.

---

## 2026-08-01

### Decision

A collapsed debug section may expose diagnostic views that are unavailable in ordinary exploration. Its initial options reveal faint non-navigable encounter positions, node IDs, and the four source distances plus active composite distance without revealing the complete path network.

### Reasoning

Diagnostic visibility helps evaluate geographic distribution and generated neighborhoods while keeping implementation controls outside the primary interface.

### Alternatives Considered

- Keeping diagnostic tools entirely outside the public page.
- Revealing every node and every path together.

### Implications

Debug controls remain collapsed by default. Debug-only nodes must be visually subordinate and cannot be used to bypass generated navigation. Distance diagnostics recalculate whenever the current encounter or selected dimensions change.

---

## 2026-08-01

### Decision

Time, Feeling, and Knowing are selected by default. Place remains available but begins unselected. The public map uses a local coastline outline instead of raster tiles, and the interface uses a simpler monospace typographic system.

### Reasoning

Beginning without Place makes the project's alternative forms of nearness immediately perceptible. Removing detailed tiles allows geography to remain present without visually dominating paths and encounters. Monospace typography and fewer visible divisions further quiet the interface.

### Alternatives Considered

- Keeping all four dimensions selected by default.
- Retaining raster tiles at lower opacity.
- Keeping separate serif and sans-serif interface typography.

### Implications

This supersedes the earlier default-selection decision while retaining equal weighting for every selected dimension. Geographic coordinates remain fixed, Place can still be selected at any time, and coastline data is served locally as static GeoJSON.

---

## 2026-08-01

### Decision

The first public prototype will use five clearly fictional placeholder encounters. Their coordinates are generalized and their media are replaceable.

### Reasoning

Placeholder material allows the complete publishing and navigation workflow to be tested before real encounters are made public.

### Alternatives Considered

- Waiting for final encounter content.
- Treating draft personal material as temporary public data.

### Implications

Placeholder records must identify themselves as fictional, use stable IDs, and be replaceable without changing application code. No placeholder should be mistaken for documentary material.

---

## 2026-08-01

### Decision

The first web map will use a locally hosted copy of Leaflet and will consume GeoJSON exported from QGIS.

### Reasoning

Leaflet is lightweight, works on a static GitHub Pages site, and accepts the same standard interchange format produced by the QGIS workflow. Hosting it locally preserves relative asset paths and avoids making the interface dependent on a third-party CDN.

### Alternatives Considered

- A custom SVG map.
- A larger vector-map framework.
- Loading Leaflet from a public CDN.

### Implications

Leaflet is a presentation dependency only. QGIS remains the analytical authority, and the application must not require a server or build step.

---

## 2026-08-01

### Decision

The prototype will use deterministic, documented distance formulas for Place, Time, Feeling, and Knowing.

### Reasoning

The navigation specification defines how selected distances are combined but not how the four source distances are derived. A reproducible first model is required to build and evaluate the vertical slice.

### Alternatives Considered

- Hand-authoring every pairwise distance.
- Deferring navigation until a final analytical model exists.
- Calculating opaque distances in the browser.

### Implications

QGIS export tooling will generate normalized public distances. The formulas may evolve, but any change must be recorded here and regenerate the derived distance file.

---

## 2026-08-01

### Decision

Neighborhood thresholds are global percentiles calculated for each selected dimension combination. Paths are undirected. Connectivity bridges are added before the six-neighbor cap, a required bridge reserves a visible slot, and equal distances are ordered by encounter ID.

### Reasoning

These rules make the navigation graph reproducible, connected, and bounded while retaining a definition of nearness that adapts as the archive grows.

### Alternatives Considered

- A percentile calculated independently for each inhabited encounter.
- Directed paths.
- Adding bridges after applying the visible-neighbor cap.

### Implications

Generated distance data and the browser implementation must use identical ordering and connectivity rules. With fewer than four encounters, the minimum visible neighborhood becomes every other available encounter.

---

## 2026-08-01

### Decision

Retrace removes the current encounter from a navigation-history stack and returns to the new top item. Retracing does not create another history entry.

### Reasoning

Stack semantics preserve the ordinary meaning of retracing a route and prevent two encounters from toggling indefinitely.

### Alternatives Considered

- Treating Retrace as a new forward traversal.
- Retaining only one previous encounter.

### Implications

Retrace is unavailable at the initial encounter. Forward traversal after retracing begins a new continuation from the remaining history.

## 2026-08-01

### Decision

The project's fundamental unit is an **Encounter** rather than a **Fragment**.

### Reasoning

"Encounter" emphasizes a relationship between the visitor and the material rather than describing the material itself as a broken or isolated object.

The term is flexible enough to encompass memories, places, dreams, photographs, conversations, datasets, and imagined futures without privileging one ontology over another.

### Alternatives Considered

- Fragment
- Site
- Place
- Trace
- Clearing

### Implications

Future documentation, interfaces, and data models should consistently use "Encounter" as the public-facing term.

---

## 2026-08-01

### Decision

The project's public dimensions are:

- Place
- Time
- Feeling
- Knowing

### Reasoning

These terms function as intuitive questions rather than technical categories.

They preserve the project's conceptual richness while avoiding backend terminology.

### Alternatives Considered

- Spatial
- Temporal
- Affective
- Ontological
- Epistemic

### Implications

Technical terminology should remain confined to implementation where necessary.

The visitor should interact only with the public vocabulary.

---

## 2026-08-01

### Decision

Encounter locations remain geographically fixed.

Only paths change.

### Reasoning

The project is not attempting to abandon geography.

Instead, it proposes alternative forms of proximity while allowing geographic space to remain continuously visible.

The resulting tension between fixed locations and changing relationships is central to the project's cartographic argument.

### Alternatives Considered

- Rearranging nodes according to each selected dimension.
- Pure graph layouts without geographic positioning.

### Implications

The map should always communicate two simultaneous systems:

- physical geography
- relational topology

---

## 2026-08-01

> Superseded later on 2026-08-01: Time, Feeling, and Knowing now begin selected, while Place begins unselected.

### Decision

Visitors may select any combination of Place, Time, Feeling, and Knowing when determining nearness.

All four dimensions are selected by default.

### Reasoning

Checkboxes allow visitors to redefine nearness without introducing complicated weighting systems.

The interface remains simple while permitting rich combinations.

### Alternatives Considered

- Separate composite mode.
- Single-dimension navigation only.
- User-defined weighting.

### Implications

Nearness is always calculated as the equally weighted mean of the currently selected dimensions.

The interface should never expose the underlying calculation.

---

## 2026-08-01

### Decision

Navigation reveals a local visible neighborhood rather than the complete encounter network.

### Reasoning

The project is fundamentally about discovering a landscape through movement rather than surveying it from above.

Local visibility preserves opacity while ensuring every encounter remains eventually reachable.

### Alternatives Considered

- Displaying the entire network.
- Fixed nearest-neighbor lists.
- Unrestricted search.

### Implications

Future navigation algorithms should continue to privilege local orientation over global visibility.

---

## 2026-08-01

### Decision

QGIS is the authoritative analytical environment for DESIRE PATH.

The website is one possible traversal of the underlying cartography.

### Reasoning

Separating the analytical model from the public interface allows the project to evolve without conflating data with presentation.

It also ensures that GIS remains central to the project's methodology.

### Alternatives Considered

- Treating the website as the primary data source.
- Building the project entirely as a web application.

### Implications

Future interfaces should derive from the underlying cartographic model rather than replacing it.

---
