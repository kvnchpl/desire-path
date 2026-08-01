# AGENTS.md

# DESIRE PATH

DESIRE PATH is an experimental cartographic artwork that explores multidimensional proximity between encounters.

It is simultaneously:

- an artwork,
- a map,
- a hypermedia archive,
- a GIS project,
- and an experiment in alternative forms of navigation.

The project is intentionally structured so that geographic space remains visible without necessarily determining adjacency. Visitors gradually discover that nearness can arise from place, time, feeling, knowing, or any combination thereof.

This document serves as the primary operating instructions for anyone (human or AI) contributing to this repository.

---

# Guiding Principles

## The map is discovered through movement.

The project rejects the assumption that a map must be fully visible before navigation begins.

Visitors should never be able to survey the complete landscape.

Instead, they construct an understanding of the map by moving through it.

Knowledge follows movement rather than preceding it.

---

## Geographic space is privileged, but not sovereign.

Every encounter occupies geographic space whenever possible.

However, geographic proximity is only one possible form of nearness.

Other forms of adjacency are equally legitimate.

The project intentionally asks visitors to reconsider what it means for two experiences to be "near."

---

## The interface should remain quiet.

Avoid visual or textual clutter.

Avoid unnecessary explanation.

Avoid exposing implementation details.

The interface should feel calm, spacious, and restrained.

It should invite exploration rather than instruct it.

---

## Preserve ambiguity.

Do not over-explain the project.

Do not attempt to eliminate every ambiguity.

Allow visitors to infer relationships through experience.

Prefer suggestion over explanation.

---

## The computer thinks in coordinates.

The visitor thinks in landscapes.

Backend terminology may be technical.

Frontend terminology should remain poetic.

Never expose backend vocabulary without a compelling reason.

---

# Frontend Vocabulary

Use these terms consistently.

| Backend | Frontend |
|----------|----------|
| Fragment | Encounter |
| Connection / Edge | Path |
| Spatial | Place |
| Temporal | Time |
| Affective | Feeling |
| Ontological / Epistemic | Knowing |

Interface actions:

- Explore
- Retrace

Avoid introducing additional navigation terminology unless necessary.

---

# Navigation Philosophy

Visitors always inhabit a single encounter.

The surrounding paths are generated dynamically from the selected dimensions of nearness.

The map itself is never completely visible.

The visible neighborhood changes as the visitor moves.

Retrace always returns to the immediately previous encounter.

---

# Exploration

The interface should present:

```text
DESIRE PATH

────────────

Explore

☐ Place

☑ Time

☑ Feeling

☑ Knowing

────────────

Retrace
```

Time, Feeling, and Knowing are selected by default. Place remains available but begins unselected.

The selected dimensions determine how nearness is calculated.

At least one dimension must always remain selected.

---

# Data Philosophy

QGIS is not merely a storage format.

QGIS is the analytical engine of the project.

The public website is one possible traversal of the underlying cartography.

The website should never become the authoritative source of the project's data.

---

# Implementation Philosophy

Favor:

- simplicity
- readability
- portability
- static assets
- progressive enhancement

Avoid introducing dependencies unless they clearly improve the project.

The current implementation target is:

- HTML
- CSS
- JavaScript
- GeoJSON
- JSON
- QGIS

Do not introduce frameworks simply because they are popular.

---

# Repository Philosophy

Everything committed to this repository should be assumed to be public.

Never commit:

- private coordinates
- withheld locations
- sensitive media
- unpublished personal information

If an encounter requires a withheld location, its public geometry should already be generalized or displaced before it enters this repository.

---

# AI Collaboration

When modifying this repository:

First:

- understand the conceptual goal
- inspect existing code
- preserve terminology
- preserve design language

Before making a major conceptual or architectural change:

- consult `docs/decisions.md`
- determine whether the decision has already been made
- understand the reasoning behind that decision

If an earlier decision is intentionally reversed:

- preserve the original entry in `docs/decisions.md`
- add a new entry explaining why the decision changed
- describe the implications of the revision

Do not:

- rename concepts
- simplify ideas into conventional map interfaces
- replace poetic language with technical language
- expose backend implementation unnecessarily

If a proposed implementation conflicts with the conceptual goals of the project, prioritize the conceptual goals.

---

# Code Style

Prefer:

- small modules
- descriptive function names
- comments that explain *why*, not *what*
- explicit logic
- predictable data structures

Avoid cleverness.

The code should feel as calm as the interface.

---

# When Uncertain

When making implementation decisions, ask:

1. Does this preserve the project's philosophy?

2. Does this preserve the distinction between backend and frontend language?

3. Does this encourage exploration rather than search?

4. Does this preserve opacity rather than total visibility?

5. Does this remain consistent with previous decisions recorded in `docs/decisions.md`?

6. Does this keep the project understandable six months from now?

If the answer to any of these is "no," stop and ask for clarification rather than making assumptions.
