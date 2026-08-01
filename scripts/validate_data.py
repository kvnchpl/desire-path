#!/usr/bin/env python3
"""Validate the public DESIRE PATH data contract."""

from __future__ import annotations

import json
import sys
from itertools import combinations
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
DIMENSIONS = {"place", "time", "feeling", "knowing"}
FEELING_TYPES = (
    "JOY", "TENDERNESS", "DESIRE", "WONDER", "SERENITY", "NOSTALGIA", "MELANCHOLY", "GRIEF", "LONELINESS",
    "ANXIETY", "FEAR", "ANGER", "DISGUST", "ESTRANGEMENT", "EERINESS", "NUMBNESS", "AMBIVALENCE",
)
KNOWING_TYPES = (
    "WITNESSED", "REMEMBERED", "INHERITED", "DOCUMENTED", "DREAMED", "IMAGINED", "ANTICIPATED", "INFERRED",
    "GENERATED", "UNRESOLVED",
)
ENUMS = {
    "time": {"DISTANT_PAST", "RECENT_PAST", "PRESENT", "NEAR_FUTURE", "DISTANT_FUTURE", "INDETERMINATE", "ATEMPORAL"},
    "feeling": set(FEELING_TYPES),
    "knowing": set(KNOWING_TYPES),
}
REMOVED_FIELDS = {
    "sp_geometry", "sp_status", "tm_extent", "tm_form_primary", "tm_form_secondary",
    "af_intensity", "af_secondary", "kn_secondary", "tm_position", "af_primary", "kn_primary",
}


def load(relative: str) -> dict:
    with (ROOT / relative).open(encoding="utf-8") as handle:
        return json.load(handle)


def validate() -> list[str]:
    errors: list[str] = []
    encounter_data = load("data/encounters.json")
    distances = load("data/distances.json")
    settings = load("data/settings.json")
    feeling_distances = load("data/feeling-distances.json")
    knowing_distances = load("data/knowing-distances.json")
    versions = {
        encounter_data.get("schema_version"), distances.get("schema_version"), settings.get("schema_version"),
        feeling_distances.get("schema_version"), knowing_distances.get("schema_version"),
    }
    if len(versions) != 1 or None in versions:
        errors.append("all public data files must share a schema_version")
    if encounter_data.get("generated") is not True or distances.get("generated") is not True:
        errors.append("encounters.json and distances.json must be generated public files")
    encounters = encounter_data.get("encounters", [])
    ids: list[str] = []
    for index, encounter in enumerate(encounters):
        context = f"encounter {index + 1}"
        encounter_id = encounter.get("id")
        if not isinstance(encounter_id, str) or not encounter_id:
            errors.append(f"{context}: id is required")
        elif encounter_id in ids:
            errors.append(f"{context}: duplicate id {encounter_id}")
        else:
            ids.append(encounter_id)
        if not encounter.get("title"):
            errors.append(f"{context}: title is required")
        place = encounter.get("place")
        if not isinstance(place, list) or len(place) != 2 or not all(isinstance(value, (int, float)) for value in place):
            errors.append(f"{context}: place must be a [longitude, latitude] pair")
        elif not -180 <= place[0] <= 180 or not -90 <= place[1] <= 90:
            errors.append(f"{context}: place coordinates are outside valid longitude and latitude ranges")
        for field, allowed in ENUMS.items():
            if encounter.get(field) not in allowed:
                errors.append(f"{context}: invalid {field}")
        for field in REMOVED_FIELDS & encounter.keys():
            errors.append(f"{context}: removed field {field} must not be exported")
        media_entries = encounter.get("media")
        if not isinstance(media_entries, list) or not media_entries:
            errors.append(f"{context}: media must be a non-empty array")
            media_entries = []
        for media_index, media in enumerate(media_entries):
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
            elif media.get("type") in {"image", "audio", "video"}:
                errors.append(f"{media_context}: {media.get('type')} media requires src")
            if media.get("type") == "text" and not media.get("text"):
                errors.append(f"{media_context}: text media requires text")
            if media.get("type") == "image" and not media.get("alt"):
                errors.append(f"{media_context}: image media requires alt text")

    for label, source, categories in (
        ("feeling", feeling_distances, FEELING_TYPES),
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
