# DESIRE PATH

DESIRE PATH is an experimental mapping project about the different ways encounters become near.

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

The repository contains a CSV-authored dataset and a static public website. A Python exporter turns the encounter rows into the public JSON and precomputed navigation graphs used by the site.

### Requirements

- Node.js and npm, for the convenience commands below
- Python 3.10 or newer

The public site uses plain HTML, CSS, JavaScript, JSON, GeoJSON, and a locally vendored copy of [Leaflet 1.9.4](vendor/leaflet/README.md). There is no build step or application server.

### Run locally

Serve the repository over HTTP so the browser can load its data files:

```sh
npm run serve
```

Open the local address printed in the terminal.

The site is served at `http://localhost:8080/` using Python's standard-library HTTP server; no package installation or global command is required.

Validate the public data with:

```sh
npm test
```

This validates the CSV, the generated public contract, referenced media files, and whether the generated JSON is current. The same check runs automatically on every push and pull request through GitHub Actions. Review the interface in a browser after changing its behavior or presentation.

### Authoritative and generated data

Author encounters in `data/encounters.csv`. This is the single source of truth for encounter content, categories, and coordinates.

Do not edit these generated files by hand:

- `data/encounters.json` — public encounter and media records
- `data/navigation.json` — all 15 precomputed neighborhood graphs and debugging-path metadata

These files are authored configuration:

- `data/encounters.csv` — encounter content, categories, and coordinates
- `data/settings.json` — initial encounter, percentile, 3–4 neighborhood limits, and map settings
- `data/feeling-distances.json` — the 21 Feeling category pairs
- `data/knowing-distances.json` — the 21 Knowing category pairs

`data/coastline.geojson` is a clipped Natural Earth coastline extract used as geographic context. Natural Earth data is public domain.

### Add or update an encounter

1. Open `data/encounters.csv` in a spreadsheet application or a text editor that preserves CSV quoting.
2. Add a row or update the existing row, using the schema below.
3. In Google Maps, right-click the location and select the displayed coordinates to copy them. Google Maps copies `latitude, longitude`; paste the first number into `latitude` and the second into `longitude`.
4. Put publishable media in a directory such as `media/E016/` and reference it with repository-relative paths.
5. Save or export the file as UTF-8 CSV. Keep the existing header names unchanged.
6. From the repository root, regenerate the public data:

   ```sh
   npm run export:data
   ```

7. Run the full checks:

   ```sh
   npm test
   ```

8. Run the site locally and review the encounter, every dimension combination, its nearby paths, Retrace behavior, and its media.

### Encounter schema

| Field | Type | Requirement |
|---|---|---|
| `id` | Text | Stable and unique, such as `E016`; never reuse or change an assigned ID |
| `title` | Text | Optional human-readable title; “Untitled” is used when omitted |
| `placeholder` | Boolean | `true` for provisional material; `false` for reviewed, publishable material |
| `latitude` | Number | Latitude in decimal degrees, from `-90` to `90` |
| `longitude` | Number | Longitude in decimal degrees, from `-180` to `180` |
| `time` | Text | Month in `YYYY-MM` form, or `INDETERMINATE` / `ATEMPORAL` |
| `feeling` | Category | One supported Feeling value |
| `knowing` | Category | One supported Knowing value |
| `text` | Text | Primary prose or poetry; multiline cells are preserved |
| `media` | JSON array | Optional additional image, audio, video, or text objects |

The exporter converts the two coordinate columns into `place: [longitude, latitude]` for the website. Every coordinate committed to this repository must be considered public. Generalize, displace, or omit private and withheld locations before saving the CSV.

The exporter ranks the archive's distinct `YYYY-MM` values across the occupied
timeline from `0` to `1`. This preserves equality for simultaneous encounters
while preventing a dense period from collapsing into one broad category.
`INDETERMINATE` and `ATEMPORAL` each coincide with themselves and receive the
maximum distance from dated encounters and from one another.

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

Put an encounter's primary written content directly in the `text` column. Line breaks and repeated spaces are preserved, including multiline poetry. A spreadsheet application will quote a multiline cell correctly when it saves the CSV.

The optional `media` column accepts a JSON array of additional `text`, `image`, `audio`, or `video` objects. Leave it blank when the encounter only has written content. In a spreadsheet cell, an image value looks like:

```json
[{"type":"image","src":"media/E016/image.jpg","alt":"brief image description"}]
```

Audio and video use the same structure with `"type":"audio"` or `"type":"video"` and a relative `src`. Every informative image requires `alt`. Any media object may include an optional `caption`.

For unusual cases that require several text blocks in a specific order, leave the primary `text` column blank and put the complete ordered sequence in `media`:

```json
[{"type":"image","src":"media/E016/image.jpg","alt":"brief image description"},{"type":"text","text":"text after the image"}]
```

Media paths must be safe, relative paths that resolve to committed public files. Never commit sensitive, withheld, or unpublished media.

Before adding media paths to the CSV, create compact web copies with:

```sh
npm run normalize:media
```

This replaces supported files below `media/` in place, preserving encounter
subdirectories while changing filename extensions where necessary. Images become
WebP (under 500 KB), audio becomes Opus in a WebM container (under 1 MB), and video
becomes VP9/Opus WebM (under 2 MB). Placeholder media is skipped. The encoder favors
smaller files over fidelity and strips metadata. A source is removed only after its
normalized replacement succeeds. To retain the originals, pass a separate output
directory, such as `-- --output-dir media-normalized`.

The utility requires `ffmpeg` and `ffprobe`. On macOS with Homebrew, install both
with `brew install ffmpeg`.

### Export and navigation

`npm run export:data` performs the complete publishing pipeline:

1. Python reads and validates `data/encounters.csv` using only the standard library.
2. The exporter converts each row into `data/encounters.json`.
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

### Repository structure

```text
index.html                  public interface
css/                        visual language
js/                         encounter, map, and navigation modules
data/                       authored configuration and generated public data
media/                      public encounter media
scripts/                    CSV export, navigation generation, and validation
vendor/leaflet/             locally hosted presentation dependency
```

### Licensing

DESIRE PATH does not yet declare a project license. Until one is selected, no permission is granted to copy, modify, or redistribute the project’s original code, documentation, data, or media.

Third-party components retain their own licenses. The locally vendored Leaflet dependency is covered by `vendor/leaflet/LICENSE`. Natural Earth coastline data is public domain.
