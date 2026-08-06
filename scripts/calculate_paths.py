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
        (a["id"], b["id"]): haversine(a["place"], b["place"])
        for a, b in combinations(encounters, 2)
    }
    maximum_place = max(raw_places.values(), default=1.0) or 1.0
    pairs = []
    for a, b in combinations(encounters, 2):
        pair_id = (a["id"], b["id"])
        time_position = abs(TIME_POSITIONS.index(a["time"]) - TIME_POSITIONS.index(b["time"])) / (len(TIME_POSITIONS) - 1)
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
