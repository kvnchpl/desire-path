# Public data

`encounters.geojson` and `distances.json` are generated public files. Do not edit them by hand.

The authoritative encounter layer is `qgis/encounters.gpkg`. After editing it in QGIS, regenerate both public files from the repository root:

```sh
python3 qgis/scripts/export_public.py
```

`settings.json` is authored configuration and may be edited directly. Everything in this directory is published through GitHub Pages and must be safe for public access.

The fictional sample encounters collectively exercise every supported Place, Time, Feeling, and Knowing category. Placeholder records also cover text, image, audio, and video media so each display path can be tested before final material is supplied.

`coastline.geojson` is a clipped static extract of Natural Earth 1:10m coastline data. Natural Earth data is public domain; the source extract covers the regional context needed by this prototype.
