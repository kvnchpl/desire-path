# QGIS workflow

The canonical navigation rules are maintained in [`navigation-spec.md`](navigation-spec.md). This file contains practical QGIS and browser implementation notes.

## From QGIS to the website

QGIS is the place where encounters are authored and reviewed. The browser reads derived public files only.

1. Open `qgis/desire-path.qgz` in QGIS.
2. Select the **Encounters** layer and make edits in its attribute table or form view.
3. Confirm that every geometry is already safe to publish. Generalize or displace withheld locations before export.
4. Save the QGIS project and its **Encounters** layer.
5. From the repository root, run `npm run export:data`.
6. Run `npm test` before publishing.

The export command uses QGIS's GDAL tools to write RFC 7946 GeoJSON in `EPSG:4326`, restores public collection metadata, generates all pairwise distances, and runs the data validator. The generated files in `data/` should not be edited by hand.

The current prototype's nested `media` values may appear in QGIS as serialized JSON. The export command converts the GeoPackage JSON field back into a public JSON array.

## Opening the project

The project uses relative paths and keeps its source features in `qgis/encounters.gpkg`. If QGIS reports a missing layer, choose **Layer → Data Source Manager → GeoPackage**, select that file, and add the `encounters` layer.

The browser's path lines are intentionally generated at runtime. They do not belong in the authoritative encounter layer.
