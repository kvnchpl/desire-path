#!/usr/bin/env python3
"""Generate public pairwise distances from an encounter GeoJSON export."""

from __future__ import annotations

import argparse
import json
import math
from itertools import combinations
from pathlib import Path

TIME_POSITIONS = [
    "DISTANT_PAST",
    "RECENT_PAST",
    "PRESENT",
    "NEAR_FUTURE",
    "DISTANT_FUTURE",
    "INDETERMINATE",
    "ATEMPORAL",
]


def haversine(a: list[float], b: list[float]) -> float:
    lon1, lat1, lon2, lat2 = map(math.radians, [a[0], a[1], b[0], b[1]])
    delta_lon, delta_lat = lon2 - lon1, lat2 - lat1
    value = math.sin(delta_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
    return 6371.0088 * 2 * math.asin(math.sqrt(value))


def mismatch(left: object, right: object) -> float:
    return 0.0 if left == right else 1.0


def label_distance(properties_a: dict, properties_b: dict, prefix: str) -> float:
    labels_a = {properties_a[f"{prefix}_primary"]}
    labels_b = {properties_b[f"{prefix}_primary"]}
    if properties_a.get(f"{prefix}_secondary"):
        labels_a.add(properties_a[f"{prefix}_secondary"])
    if properties_b.get(f"{prefix}_secondary"):
        labels_b.add(properties_b[f"{prefix}_secondary"])
    return 1 - len(labels_a & labels_b) / len(labels_a | labels_b)


def calculate(features: list[dict]) -> list[dict]:
    raw_places = {
        (a["properties"]["id"], b["properties"]["id"]): haversine(a["geometry"]["coordinates"], b["geometry"]["coordinates"])
        for a, b in combinations(features, 2)
    }
    maximum_place = max(raw_places.values(), default=1.0) or 1.0
    pairs = []
    for a, b in combinations(features, 2):
        props_a, props_b = a["properties"], b["properties"]
        pair_id = (props_a["id"], props_b["id"])
        time_position = abs(TIME_POSITIONS.index(props_a["tm_position"]) - TIME_POSITIONS.index(props_b["tm_position"])) / (len(TIME_POSITIONS) - 1)
        pairs.append(
            {
                "a": pair_id[0],
                "b": pair_id[1],
                "place": round(raw_places[pair_id] / maximum_place, 6),
                "time": round(
                    (time_position + mismatch(props_a["tm_extent"], props_b["tm_extent"]) + mismatch(props_a["tm_form_primary"], props_b["tm_form_primary"])) / 3,
                    6,
                ),
                "feeling": round((abs(props_a["af_intensity"] - props_b["af_intensity"]) + label_distance(props_a, props_b, "af")) / 2, 6),
                "knowing": round(label_distance(props_a, props_b, "kn"), 6),
            }
        )
    return pairs


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=Path("data/encounters.geojson"))
    parser.add_argument("--output", type=Path, default=Path("data/distances.json"))
    args = parser.parse_args()
    source = json.loads(args.input.read_text())
    result = {
        "schema_version": source["schema_version"],
        "generated_from": args.input.name,
        "dimensions": ["place", "time", "feeling", "knowing"],
        "pairs": calculate(source["features"]),
    }
    args.output.write_text(json.dumps(result, indent=2) + "\n")


if __name__ == "__main__":
    main()
