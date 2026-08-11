#!/usr/bin/env python3
"""Calculate pairwise distances as an intermediate navigation model."""

from __future__ import annotations

import json
import math
from itertools import combinations
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEELING_DISTANCES_PATH = ROOT / "data" / "feeling-distances.json"
KNOWING_DISTANCES_PATH = ROOT / "data" / "knowing-distances.json"

SPECIAL_TIMES = {"INDETERMINATE", "ATEMPORAL"}


def time_positions(encounters: list[dict]) -> dict[str, float]:
    """Place dated encounters on an empirical timeline.

    Ranking the distinct month values keeps the Time dimension useful when
    most encounters occupy a narrow portion of a much longer chronology.
    Encounters at the same authored time intentionally remain coincident.
    """
    authored = sorted({encounter["time"] for encounter in encounters if encounter["time"] not in SPECIAL_TIMES})
    denominator = max(len(authored) - 1, 1)
    return {value: index / denominator for index, value in enumerate(authored)}


def time_distance(left: str, right: str, positions: dict[str, float]) -> float:
    if left in SPECIAL_TIMES or right in SPECIAL_TIMES:
        return 0.0 if left == right else 1.0
    return abs(positions[left] - positions[right])


def haversine(a: list[float], b: list[float]) -> float:
    lon1, lat1, lon2, lat2 = map(math.radians, [a[0], a[1], b[0], b[1]])
    delta_lon, delta_lat = lon2 - lon1, lat2 - lat1
    value = math.sin(delta_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
    return 6371.0088 * 2 * math.asin(math.sqrt(value))


def categorical_distances(path: Path) -> dict:
    source = json.loads(path.read_text(encoding="utf-8"))
    pairs = {tuple(sorted((pair["a"], pair["b"]))): pair["distance"] for pair in source["pairs"]}
    return {"identical": source["identical"], "default": source["default"], "pairs": pairs}


def categorical_distance(left: str, right: str, distances: dict) -> float:
    return distances["identical"] if left == right else distances["pairs"].get(tuple(sorted((left, right))), distances["default"])


def calculate(encounters: list[dict]) -> list[dict]:
    feelings = categorical_distances(FEELING_DISTANCES_PATH)
    knowings = categorical_distances(KNOWING_DISTANCES_PATH)
    raw_places = {
        # Quantize to one millimetre before normalization so platform libm
        # differences cannot change exact percentile and bridge comparisons.
        (a["id"], b["id"]): round(haversine(a["place"], b["place"]), 6)
        for a, b in combinations(encounters, 2)
    }
    maximum_place = max(raw_places.values(), default=1.0) or 1.0
    normalized_times = time_positions(encounters)
    pairs = []
    for a, b in combinations(encounters, 2):
        pair_id = (a["id"], b["id"])
        time_position = time_distance(a["time"], b["time"], normalized_times)
        pairs.append(
            {
                "a": pair_id[0],
                "b": pair_id[1],
                "place": round(raw_places[pair_id] / maximum_place, 6),
                "time": round(time_position, 6),
                "feeling": round(categorical_distance(a["feeling"], b["feeling"], feelings), 6),
                "knowing": round(categorical_distance(a["knowing"], b["knowing"], knowings), 6),
            }
        )
    return pairs
