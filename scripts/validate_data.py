#!/usr/bin/env python3
"""Check that the public data is complete enough for the website to run."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
DIMENSIONS = ("place", "time", "feeling", "knowing")
MEDIA_TYPES = {"text", "image", "audio", "video"}
SPECIAL_TIME_VALUES = {"INDETERMINATE", "ATEMPORAL"}
MONTH_PATTERN = re.compile(r"^\d{4}-(?:0[1-9]|1[0-2])$")
FEELING_VALUES = {"JOY", "DESIRE", "WONDER", "NOSTALGIA", "GRIEF", "FEAR", "ANGER"}
KNOWING_VALUES = {
    "WITNESSED", "REMEMBERED", "INHERITED", "DOCUMENTED",
    "DREAMED", "IMAGINED", "UNRESOLVED",
}


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def safe_file(value: object) -> bool:
    if not isinstance(value, str) or not value:
        return False
    path = PurePosixPath(value)
    return not path.is_absolute() and ".." not in path.parts and "://" not in value and (ROOT / path).is_file()


def validate(
    encounters_path: Path | None = None,
    navigation_path: Path | None = None,
    settings_path: Path | None = None,
) -> list[str]:
    errors: list[str] = []
    encounter_data = load(encounters_path or ROOT / "data/encounters.json")
    navigation = load(navigation_path or ROOT / "data/navigation.json")
    settings = load(settings_path or ROOT / "data/settings.json")

    encounters = encounter_data.get("encounters")
    if not isinstance(encounters, list) or not encounters:
        return errors + ["encounters must be a nonempty array"]

    ids: set[str] = set()
    for index, encounter in enumerate(encounters, 1):
        if not isinstance(encounter, dict):
            errors.append(f"encounter {index} must be an object")
            continue
        encounter_id = encounter.get("id")
        if not isinstance(encounter_id, str) or not encounter_id or encounter_id in ids:
            errors.append(f"encounter {index} must have a unique id")
        else:
            ids.add(encounter_id)
        if not isinstance(encounter.get("title"), str) or not encounter["title"].strip():
            errors.append(f"encounter {index} must have a title")
        time = encounter.get("time")
        if not isinstance(time, str) or (time not in SPECIAL_TIME_VALUES and not MONTH_PATTERN.fullmatch(time)):
            errors.append(f"encounter {index} time must be YYYY-MM, INDETERMINATE, or ATEMPORAL")
        for field, supported in (
            ("feeling", FEELING_VALUES),
            ("knowing", KNOWING_VALUES),
        ):
            if encounter.get(field) not in supported:
                errors.append(f"encounter {index} has an invalid {field} value")
        place = encounter.get("place")
        if not isinstance(place, list) or len(place) != 2 or not all(type(value) in (int, float) for value in place):
            errors.append(f"encounter {index} must have a numeric [longitude, latitude] place")
        elif not -180 <= place[0] <= 180 or not -90 <= place[1] <= 90:
            errors.append(f"encounter {index} has coordinates outside longitude/latitude bounds")
        media = encounter.get("media")
        if not isinstance(media, list):
            errors.append(f"encounter {index} media must be an array")
            continue
        for media_index, item in enumerate(media, 1):
            context = f"encounter {index}, media {media_index}"
            if not isinstance(item, dict) or item.get("type") not in MEDIA_TYPES:
                errors.append(f"{context} has an invalid type")
                continue
            if item["type"] == "text" and not isinstance(item.get("text"), str):
                errors.append(f"{context} requires text")
            if item["type"] != "text" and not safe_file(item.get("src")):
                errors.append(f"{context} requires an existing safe relative src")
            if item["type"] == "image" and not isinstance(item.get("alt"), str):
                errors.append(f"{context} requires alt text")

    if settings.get("initial_encounter") not in ids:
        errors.append("settings.initial_encounter must reference an encounter")
    minimum = settings.get("minimum_neighbors")
    maximum = settings.get("maximum_neighbors")
    if type(minimum) is not int or type(maximum) is not int or not 0 <= minimum <= maximum:
        errors.append("neighbor limits must be nonnegative integers with minimum <= maximum")
        minimum, maximum = 0, len(ids)
    map_settings = settings.get("map")
    if not isinstance(map_settings, dict) or not safe_file(map_settings.get("coastline")):
        errors.append("settings.map.coastline must reference an existing safe relative file")

    combinations = navigation.get("combinations")
    expected_keys = {
        "+".join(dimension for bit, dimension in enumerate(DIMENSIONS) if mask & (1 << bit))
        for mask in range(1, 2 ** len(DIMENSIONS))
    }
    if not isinstance(combinations, dict) or set(combinations) != expected_keys:
        return errors + ["navigation must contain all 15 dimension combinations"]
    for key, combination in combinations.items():
        neighborhoods = combination.get("neighborhoods") if isinstance(combination, dict) else None
        if not isinstance(neighborhoods, dict) or set(neighborhoods) != ids:
            errors.append(f"navigation {key} must contain every encounter")
            continue
        for encounter_id, neighbors in neighborhoods.items():
            if not isinstance(neighbors, list) or not minimum <= len(neighbors) <= maximum:
                errors.append(f"navigation {key}, {encounter_id} has an invalid neighborhood size")
                continue
            neighbor_ids = [neighbor.get("id") for neighbor in neighbors if isinstance(neighbor, dict)]
            if len(neighbor_ids) != len(neighbors) or len(set(neighbor_ids)) != len(neighbor_ids) or not set(neighbor_ids) <= ids - {encounter_id}:
                errors.append(f"navigation {key}, {encounter_id} has invalid neighbors")

    paths = navigation.get("possible_paths")
    if not isinstance(paths, list) or any(
        not isinstance(path, dict)
        or path.get("a") not in ids
        or path.get("b") not in ids
        or not isinstance(path.get("near"), list)
        or not isinstance(path.get("a_to_b"), bool)
        or not isinstance(path.get("b_to_a"), bool)
        for path in paths
    ):
        errors.append("navigation.possible_paths contains an invalid path")
    return errors


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--encounters", type=Path)
    parser.add_argument("--navigation", type=Path)
    parser.add_argument("--settings", type=Path)
    arguments = parser.parse_args()
    try:
        errors = validate(arguments.encounters, arguments.navigation, arguments.settings)
    except (OSError, json.JSONDecodeError, KeyError, TypeError) as error:
        errors = [str(error)]
    if errors:
        for error in errors:
            print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
    print("DESIRE PATH data is valid.")


if __name__ == "__main__":
    main()
