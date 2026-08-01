#!/usr/bin/env python3
"""Validate the public DESIRE PATH data contract."""

from __future__ import annotations

import json
import sys
from itertools import combinations
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
DIMENSIONS = {"place", "time", "feeling", "knowing"}
AFFECT_TYPES = (
    "JOY", "TENDERNESS", "DESIRE", "WONDER", "SERENITY", "NOSTALGIA", "MELANCHOLY", "GRIEF", "LONELINESS",
    "ANXIETY", "FEAR", "ANGER", "DISGUST", "ESTRANGEMENT", "EERINESS", "NUMBNESS", "AMBIVALENCE",
)
KNOWING_TYPES = (
    "WITNESSED", "REMEMBERED", "INHERITED", "DOCUMENTED", "DREAMED", "IMAGINED", "ANTICIPATED", "INFERRED",
    "GENERATED", "UNRESOLVED",
)
ENUMS = {
    "tm_position": {"DISTANT_PAST", "RECENT_PAST", "PRESENT", "NEAR_FUTURE", "DISTANT_FUTURE", "INDETERMINATE", "ATEMPORAL"},
    "af_primary": set(AFFECT_TYPES),
    "kn_primary": set(KNOWING_TYPES),
}
REMOVED_FIELDS = {
    "sp_geometry", "sp_status", "tm_extent", "tm_form_primary", "tm_form_secondary",
    "af_intensity", "af_secondary", "kn_secondary",
}


def load(relative: str) -> dict:
    with (ROOT / relative).open(encoding="utf-8") as handle:
        return json.load(handle)


def validate() -> list[str]:
    errors: list[str] = []
    encounters = load("data/encounters.geojson")
    distances = load("data/distances.json")
    settings = load("data/settings.json")
    affect_distances = load("data/affect-distances.json")
    knowing_distances = load("data/knowing-distances.json")
    if encounters.get("type") != "FeatureCollection":
        errors.append("encounters.geojson must be a FeatureCollection")
    versions = {
        encounters.get("schema_version"), distances.get("schema_version"), settings.get("schema_version"),
        affect_distances.get("schema_version"), knowing_distances.get("schema_version"),
    }
    if len(versions) != 1 or None in versions:
        errors.append("all public data files must share a schema_version")
    if encounters.get("generated") is not True or distances.get("generated") is not True:
        errors.append("encounters.geojson and distances.json must be generated public files")
    features = encounters.get("features", [])
    ids: list[str] = []
    for index, feature in enumerate(features):
        context = f"feature {index + 1}"
        props = feature.get("properties", {})
        encounter_id = props.get("id")
        if not isinstance(encounter_id, str) or not encounter_id:
            errors.append(f"{context}: id is required")
        elif encounter_id in ids:
            errors.append(f"{context}: duplicate id {encounter_id}")
        else:
            ids.append(encounter_id)
        if not props.get("title"):
            errors.append(f"{context}: title is required")
        geometry = feature.get("geometry")
        if not geometry or geometry.get("type") != "Point" or len(geometry.get("coordinates", [])) != 2:
            errors.append(f"{context}: the public prototype requires a representative Point")
        for field, allowed in ENUMS.items():
            if props.get(field) not in allowed:
                errors.append(f"{context}: invalid {field}")
        for field in REMOVED_FIELDS & props.keys():
            errors.append(f"{context}: removed field {field} must not be exported")
        for media_index, media in enumerate(props.get("media", [])):
            media_context = f"{context}, media {media_index + 1}"
            if media.get("type") not in {"text", "image", "audio", "video"}:
                errors.append(f"{media_context}: invalid type")
            src = media.get("src")
            if src:
                path = PurePosixPath(src)
                if path.is_absolute() or ".." in path.parts or "://" in src:
                    errors.append(f"{media_context}: src must be a safe relative path")
                elif not (ROOT / path).is_file():
                    errors.append(f"{media_context}: missing file {src}")
            if media.get("type") == "text" and not media.get("text"):
                errors.append(f"{media_context}: text media requires text")
            if media.get("type") == "image" and not media.get("alt"):
                errors.append(f"{media_context}: image media requires alt text")

    for label, source, categories in (
        ("affect", affect_distances, AFFECT_TYPES),
        ("knowing", knowing_distances, KNOWING_TYPES),
    ):
        for field in ("identical", "default"):
            value = source.get(field)
            if not isinstance(value, (int, float)) or not 0 <= value <= 1:
                errors.append(f"{label}-distances.{field} must be between 0 and 1")
        seen_pairs = set()
        ordered_pairs = []
        for index, pair in enumerate(source.get("pairs", [])):
            ordered_pairs.append((pair.get("a"), pair.get("b")))
            key = tuple(sorted((pair.get("a"), pair.get("b"))))
            if key[0] not in categories or key[1] not in categories or key[0] == key[1]:
                errors.append(f"{label} distance pair {index + 1} contains invalid categories")
            if key in seen_pairs:
                errors.append(f"duplicate {label} distance pair {key}")
            seen_pairs.add(key)
            value = pair.get("distance")
            if not isinstance(value, (int, float)) or not 0 <= value <= 1:
                errors.append(f"{label} distance pair {key} must be between 0 and 1")
        expected_pairs = list(combinations(categories, 2))
        if ordered_pairs != expected_pairs:
            errors.append(f"{label}-distances.pairs must contain all {len(expected_pairs)} unique pairs in canonical order")
    if settings.get("initial_encounter") not in ids:
        errors.append("settings.initial_encounter must reference an encounter")
    percentile = settings.get("visibility_percentile")
    if not isinstance(percentile, (int, float)) or not 0 <= percentile <= 100:
        errors.append("visibility_percentile must be between 0 and 100")
    expected_pairs = {tuple(sorted(pair)) for pair in combinations(ids, 2)}
    actual_pairs = set()
    for pair in distances.get("pairs", []):
        key = tuple(sorted((pair.get("a"), pair.get("b"))))
        actual_pairs.add(key)
        if key[0] not in ids or key[1] not in ids or key[0] == key[1]:
            errors.append(f"distance pair {key} contains an invalid encounter")
        for dimension in DIMENSIONS:
            value = pair.get(dimension)
            if not isinstance(value, (int, float)) or not 0 <= value <= 1:
                errors.append(f"distance pair {key}: {dimension} must be between 0 and 1")
    if actual_pairs != expected_pairs:
        errors.append("distances.json must contain every unique encounter pair exactly once")
    return errors


if __name__ == "__main__":
    try:
        problems = validate()
    except (OSError, json.JSONDecodeError, KeyError, TypeError) as error:
        problems = [str(error)]
    if problems:
        for problem in problems:
            print(f"error: {problem}", file=sys.stderr)
        raise SystemExit(1)
    print("DESIRE PATH data is valid.")
