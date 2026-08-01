# DESIRE PATH

An experimental cartographic artwork exploring multidimensional proximity between encounters.

## Repository

This repository contains both the analytical GIS project and the public web interface.

Before contributing, read:

1. AGENTS.md
2. PROJECT_CONTEXT.md
3. DATA_SCHEMA.md
4. NAVIGATION_SPEC.md
5. DESIGN_LANGUAGE.md
6. DECISIONS.md

## Current Status

Prototype.

The first working vertical slice uses fictional placeholder encounters that will later be replaced with contributed content.

Current goal:

Build a minimal vertical slice demonstrating:

- one map
- five encounters
- multidimensional navigation
- retrace
- dynamic path generation

## Run locally

Serve the repository over HTTP so the browser can load its data files:

```sh
npm run serve
```

Then open the local address printed in the terminal. There is no build step.

Run all current checks with:

```sh
npm test
```

## Data workflow

Author encounters in [`qgis/desire-path.qgz`](qgis/desire-path.qgz), export the public GeoJSON, regenerate pairwise distances, and validate before committing. Detailed steps are in [`docs/navigation.md`](docs/navigation.md).

The five current encounters and their coordinates are fictional placeholders.

The project itself does not yet declare a license. The locally vendored Leaflet dependency retains its BSD-2-Clause license in `vendor/leaflet/LICENSE`.
