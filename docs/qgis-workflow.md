# QGIS workflow

The canonical navigation rules are maintained in [`navigation-spec.md`](navigation-spec.md). This file contains practical QGIS and browser implementation notes.

## From QGIS to the website

QGIS is the place where encounters are authored and reviewed. The browser reads derived public files only.

1. Open `qgis/desire-path.qgz` in QGIS.
2. Select the **Encounters — PUBLIC LOCATIONS** layer and make edits in its form view.
3. Confirm that every geometry is already safe to publish. Generalize or displace withheld locations before export. **Coordinates in this layer are public.**
4. Save the QGIS project and its encounter layer.
5. From the repository root, run `npm run export:data`.
6. Run `npm test` before publishing.

The export command uses QGIS's GDAL tools and a temporary RFC 7946 GeoJSON file in `EPSG:4326`, then writes the public `data/encounters.json`, generates all pairwise distances, and runs the data validator. Generated files in `data/` should not be edited by hand.

The form provides controlled dropdowns for time, feeling, and knowing. Required fields and unique encounter IDs are checked when edits are saved. Media remains serialized JSON in QGIS; the export command converts it back into a public JSON array.

## Authoring the first real encounter

Use a new stable ID, such as `E016`, so the fictional encounters remain available for comparison during the first trial.

1. Put any publishable files in a dedicated directory such as `media/E016/`.
2. Add a point in the **Encounters — PUBLIC LOCATIONS** layer at a location that is safe to publish.
3. Enter a title, clear **Placeholder content**, and choose time, feeling, and knowing values from the dropdowns.
4. Enter media as a JSON array. Keep paths relative to the repository root.
5. Save the feature and project, run `npm run export:data`, then run `npm test`.
6. Review the encounter locally before committing or publishing it.

Minimal media examples:

```json
[{"type":"text","text":"encounter text"}]
```

```json
[{"type":"image","src":"media/E016/image.jpg","alt":"brief image description"}]
```

Audio and video use the same shape with `"type":"audio"` or `"type":"video"` and a relative `src` value. Multiple media entries can share one array.

## Opening the project

The project uses relative paths and keeps its source features in `qgis/encounters.gpkg`. If QGIS reports a missing layer, choose **Layer → Data Source Manager → GeoPackage**, select that file, and add the `encounters` layer.

The browser's path lines are intentionally generated at runtime. They do not belong in the authoritative encounter layer.
