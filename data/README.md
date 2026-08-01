# Public data

`encounters.geojson` and `distances.json` are generated public files. Do not edit them by hand. `affect-distances.json`, `knowing-distances.json`, and `settings.json` are authored configuration and may be edited directly.

The authoritative encounter layer is `qgis/encounters.gpkg`. After editing it in QGIS, regenerate both public files from the repository root:

```sh
python3 qgis/scripts/export_public.py
```

Everything in this directory is published through GitHub Pages and must be safe for public access.

The fictional sample encounters collectively exercise every supported Time and Knowing category, 15 of 17 Feeling categories, varied Place distances, and all four media types. Their temporary media files live in `media/placeholders/`; final media should be grouped by encounter ID under `media/`.

`coastline.geojson` is a clipped static extract of Natural Earth 1:10m coastline data. Natural Earth data is public domain; the source extract covers the regional context needed by this prototype.
