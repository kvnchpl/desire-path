# Schema notes

The canonical encounter model is maintained in [`../DATA_SCHEMA.md`](../DATA_SCHEMA.md). This file is reserved for public export examples and field-mapping guidance.

## Prototype distance model

The first vertical slice derives four normalized pairwise distances:

- **Place:** great-circle distance between public representative points, divided by the greatest pairwise place distance in the current export.
- **Time:** the mean of normalized temporal-position difference, temporal-extent mismatch, and primary temporal-form mismatch. Categorical matches are `0`; mismatches are `1`.
- **Feeling:** the mean of intensity difference and Jaccard distance between each encounter's set of primary and optional secondary feelings.
- **Knowing:** Jaccard distance between each encounter's set of primary and optional secondary ways of knowing.

All results are rounded to six decimal places. Missing dimensional values fail validation instead of being interpreted as distance. These formulas are provisional analytical choices and may be revised through the decision log.

## Public files

- `data/encounters.geojson` contains public encounter points and media metadata.
- `data/distances.json` contains every unique unordered pair once.
- `data/settings.json` contains presentation and neighborhood settings.

All three files share `schema_version: 1`.
