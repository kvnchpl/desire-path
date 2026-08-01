# Navigation notes

The canonical navigation rules are maintained in [`../NAVIGATION_SPEC.md`](../NAVIGATION_SPEC.md). This file is reserved for practical QGIS and browser implementation notes.

## From QGIS to the website

QGIS is the place where encounters are authored and reviewed. The browser reads derived public files only.

1. Open `qgis/desire-path.qgz` in QGIS.
2. Select the **Encounters** layer and make edits in its attribute table or form view.
3. Confirm that every geometry is already safe to publish. Generalize or displace withheld locations before export.
4. Right-click **Encounters**, choose **Export → Save Features As…**, and select **GeoJSON**.
5. Save to `data/encounters.geojson`, use `EPSG:4326`, and enable RFC 7946 formatting.
6. Preserve the top-level `schema_version`, `placeholder`, and `notice` members from the existing public export. QGIS exports feature properties and geometry but not these collection-level members.
7. Run `python3 qgis/calculate_paths.py` from the repository root.
8. Run `python3 scripts/validate_data.py` before publishing.

The current prototype's nested `media` values may appear in QGIS as serialized JSON depending on the GDAL/QGIS version. Verify that `media` is a JSON array in the exported GeoJSON before generating distances. A dedicated export action is the next refinement once real media are introduced.

## Opening the project

The project uses relative paths and keeps its source features in `qgis/encounters.gpkg`. If QGIS reports a missing layer, choose **Layer → Data Source Manager → GeoPackage**, select that file, and add the `encounters` layer.

`qgis/desire-path.qgs` is the readable project source and `qgis/desire-path.qgz` is its packaged QGIS form. Ordinary edits made in QGIS may update the packaged project directly.

The browser's path lines are intentionally generated at runtime. They do not belong in the authoritative encounter layer.
