# DESIRE PATH

DESIRE PATH is an experimental cartographic artwork about the different ways encounters become near.

## Experience

Most digital maps begin with an overview. DESIRE PATH begins from a single encounter and reveals its landscape through movement. The complete archive is never presented at once; understanding accumulates as the visitor follows paths from one encounter to another.

Every encounter has a fixed geographic location and may contain text, images, audio, or video. Geography remains visible, but it does not have sole authority over adjacency. Visitors can explore through four dimensions:

- **Place** — geographic nearness
- **Time** — temporal nearness
- **Feeling** — affective nearness
- **Knowing** — nearness in how something is known

Time, Feeling, and Knowing begin selected. Place remains available but begins unselected. At least one dimension must always remain active.

The active dimensions determine which three or four encounters are nearby. Selecting another combination changes the visible paths without moving the encounters themselves. Every selected dimension contributes equally to nearness.

Color offers a quiet indication of the active dimensions:

- Place is light gray.
- Time is muted red.
- Feeling is muted yellow.
- Knowing is muted blue.
- Time and Feeling mix to orange.
- Time and Knowing mix to purple.
- Feeling and Knowing mix to green.
- Time, Feeling, and Knowing together are dark gray.
- All four dimensions together are near-black.

Place remains neutral when mixed with one or two other dimensions. Nearby paths use arrowheads to suggest possible movement outward from the current encounter. On desktop, hovering over a node reveals its encounter title above the node. On touch devices, the first tap reveals the title and a second tap follows the path.

**Retrace** returns to the immediately previous encounter. Navigation history behaves as a stack, so retracing does not create another forward movement.

The optional **Options** menu can reveal every encounter position or the current encounter’s dimensional details. A separate **Advanced** menu can reveal encounter IDs or every path that can become traversable. Debugging paths remain non-navigable. Their colors indicate the dimensions through which their endpoints are near, while single- and double-ended arrows indicate whether a path can appear from one endpoint or both.

The interface is intentionally quiet. It favors exploration over search, local knowledge over overview, and suggestion over explanation.

## Development

The repository contains both the authoritative QGIS project and a static public website. QGIS is the authoring and analytical environment; the website is one generated traversal of that cartography.

### Requirements

- QGIS, including its GDAL command-line tools
- Node.js
- Python 3

The public site uses plain HTML, CSS, JavaScript, JSON, GeoJSON, and a locally vendored copy of Leaflet. There is no build step or application server.

### Run locally

Serve the repository over HTTP so the browser can load its data files:

```sh
npm run serve
```

Open the local address printed in the terminal.

Run the complete validation suite with:

```sh
npm test
```

### Authoritative and generated data

Author encounters in `qgis/desire-path.qgz`. The source layer is stored in `qgis/encounters.gpkg` and appears in QGIS as **Encounters — PUBLIC LOCATIONS**.

Do not edit these generated files by hand:

- `data/encounters.json` — public encounter and media records
- `data/navigation.json` — all 15 precomputed neighborhood graphs and debugging-path metadata

These files are authored configuration:

- `data/settings.json` — initial encounter, percentile, 3–4 neighborhood limits, and map settings
- `data/feeling-distances.json` — the 21 Feeling category pairs
- `data/knowing-distances.json` — the 21 Knowing category pairs

`data/coastline.geojson` is a clipped Natural Earth coastline extract used as geographic context. Natural Earth data is public domain.

All versioned public data currently uses schema version 5.

### Add or update an encounter

1. Open `qgis/desire-path.qgz` in QGIS.
2. Select **Encounters — PUBLIC LOCATIONS** and enter edit mode.
3. Add a point at a location that is safe to publish, or select an existing encounter to update it.
4. Complete the encounter form using the schema below.
5. Save the layer edits. Ordinary encounter edits do not require saving the QGIS project itself.
6. Put publishable media in a directory such as `media/E016/` and reference it with repository-relative paths.
7. From the repository root, regenerate the public data:

   ```sh
   npm run export:data
   ```

8. Run the full checks:

   ```sh
   npm test
   ```

9. Run the site locally and review the encounter, every dimension combination, its nearby paths, Retrace behavior, and its media.

If QGIS reports a missing layer, open **Layer → Data Source Manager → GeoPackage**, select `qgis/encounters.gpkg`, and add the `encounters` layer.

### Encounter schema

| Field | Type | Requirement |
|---|---|---|
| `id` | Text | Stable and unique, such as `E016`; never reuse or change an assigned ID |
| `title` | Text | Optional human-readable title; “Untitled” is used when omitted |
| `placeholder` | Boolean | Clear this for reviewed, publishable material |
| `geometry` | Point | Public geographic location authored in QGIS |
| `time` | Category | One supported Time value |
| `feeling` | Category | One supported Feeling value |
| `knowing` | Category | One supported Knowing value |
| `media` | JSON array | Zero or more ordered media objects |

QGIS geometry is exported as `place: [longitude, latitude]`. Every coordinate committed to this repository must be considered public. Generalize, displace, or omit private and withheld locations before saving them to the source layer.

Supported Time values:

- `DISTANT_PAST`
- `RECENT_PAST`
- `PRESENT`
- `NEAR_FUTURE`
- `DISTANT_FUTURE`
- `INDETERMINATE`
- `ATEMPORAL`

Supported Feeling values:

- `JOY`
- `DESIRE`
- `WONDER`
- `NOSTALGIA`
- `GRIEF`
- `FEAR`
- `ANGER`

Supported Knowing values:

- `WITNESSED`
- `REMEMBERED`
- `INHERITED`
- `DOCUMENTED`
- `DREAMED`
- `IMAGINED`
- `UNRESOLVED`

### Media

An encounter supports any ordered combination of `text`, `image`, `audio`, and `video` objects. Use an empty array (`[]`) for an encounter with no content; its title will appear above an empty content section.

Text:

```json
[{"type":"text","text":"encounter text"}]
```

Image:

```json
[{"type":"image","src":"media/E016/image.jpg","alt":"brief image description"}]
```

Audio and video use the same structure with `"type":"audio"` or `"type":"video"` and a relative `src`. Every informative image requires `alt`. Any media object may include an optional `caption`.

Media paths must be safe, relative paths that resolve to committed public files. Never commit sensitive, withheld, or unpublished media.

### Export and navigation

`npm run export:data` performs the complete publishing pipeline:

1. GDAL exports the QGIS encounter layer to temporary RFC 7946 GeoJSON in `EPSG:4326`.
2. The exporter converts QGIS geometry and fields into `data/encounters.json`.
3. It calculates normalized Place, Time, Feeling, and Knowing distances in memory.
4. For each of the 15 non-empty dimension combinations, it calculates a global percentile threshold.
5. It selects threshold-qualified paths, adds the minimum connectivity bridges, supplements neighborhoods with fewer than three encounters, and caps them at four.
6. It records every encounter’s ordered neighborhood, bridge status, and composite distance.
7. It derives the union of paths that can become traversable, their directional visibility, and their dimensional color metadata.
8. It writes `data/navigation.json` and validates the complete public contract.

The browser does not download pairwise distance data or calculate global graphs. It converts the selected dimensions into a canonical combination key and retrieves the current encounter’s short precomputed neighborhood. This keeps ordinary navigation proportional to the three or four paths actually visible and allows the static project to scale to a much larger archive.

The canonical navigation rules are:

- Distances are normalized from `0` (nearest) to `1` (farthest).
- Selected dimensions contribute through an equally weighted arithmetic mean.
- Thresholds use the configured percentile over every unique unordered pair.
- Paths are derived from local visibility and may appear from one endpoint or both after the neighborhood cap.
- Required connectivity bridges reserve a visible position before the cap is applied.
- Equal distances are ordered by encounter ID.
- Retrace depends only on navigation history.

### Changing the QGIS form

The controlled Time, Feeling, and Knowing dropdowns and field constraints are maintained in `qgis/scripts/configure_project.py`. After intentionally changing those controls, run:

```sh
python3 qgis/scripts/configure_project.py
```

Review and commit the resulting `qgis/desire-path.qgz` change. Do not run this command for ordinary encounter edits.

### Repository structure

```text
index.html                  public interface
css/                        visual language
js/                         encounter, map, and navigation modules
data/                       authored configuration and generated public data
media/                      public encounter media
qgis/desire-path.qgz        QGIS authoring project
qgis/encounters.gpkg        authoritative encounter layer
qgis/scripts/               export, navigation, and form utilities
scripts/                    repository validation
vendor/leaflet/             locally hosted presentation dependency
```

### Licensing

DESIRE PATH does not yet declare a project license. Until one is selected, no permission is granted to copy, modify, or redistribute the project’s original code, documentation, data, or media.

Third-party components retain their own licenses. The locally vendored Leaflet dependency is covered by `vendor/leaflet/LICENSE`. Natural Earth coastline data is public domain.
