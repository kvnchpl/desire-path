# Leaflet

This directory contains the browser distribution of [Leaflet 1.9.4](https://github.com/Leaflet/Leaflet/releases/tag/v1.9.4), vendored so the public site does not depend on a third-party content-delivery network.

Included files:

- `leaflet.js`
- `leaflet.css`
- the default marker images referenced by the stylesheet
- the upstream BSD 2-Clause license

When updating Leaflet, replace the complete distribution together, retain its license, update the version and release link above, and run `npm test`.
