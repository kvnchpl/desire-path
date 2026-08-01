 # DECISIONS.md

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

# Initial Decisions

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

# Notes

This document is intentionally cumulative.

Earlier decisions should not be rewritten unless they are superseded.

If a decision changes, add a new entry explaining why the previous decision was revised.

The evolution of the project's thinking is itself part of the project's history.