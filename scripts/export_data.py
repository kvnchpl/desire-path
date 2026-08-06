#!/usr/bin/env python3
"""Generate public encounter and navigation JSON from the authored CSV."""

from __future__ import annotations

import csv
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from calculate_navigation import generate_navigation
from calculate_paths import calculate

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "encounters.csv"
ENCOUNTERS_OUTPUT = ROOT / "data" / "encounters.json"
NAVIGATION_OUTPUT = ROOT / "data" / "navigation.json"
REQUIRED_COLUMNS = {
    "id", "title", "placeholder", "longitude", "latitude",
    "time", "feeling", "knowing", "text", "media", "time_detail",
}


def boolean(value: str, context: str) -> bool:
    normalized = value.strip().lower()
    if normalized == "true":
        return True
    if normalized == "false":
        return False
    raise ValueError(f"{context}: placeholder must be true or false")


def coordinate(value: str, name: str, context: str) -> float:
    try:
        result = float(value)
    except ValueError as error:
        raise ValueError(f"{context}: {name} must be a number") from error
    limit = 180 if name == "longitude" else 90
    if not -limit <= result <= limit:
        raise ValueError(f"{context}: {name} must be between {-limit} and {limit}")
    return result


def parse_media(value: str, context: str) -> list[dict]:
    if not value.strip():
        return []
    try:
        media = json.loads(value)
    except json.JSONDecodeError as error:
        raise ValueError(f"{context}: media is not valid JSON ({error.msg})") from error
    if not isinstance(media, list):
        raise ValueError(f"{context}: media must be a JSON array")
    return media


def export_encounters() -> dict:
    with SOURCE.open(encoding="utf-8-sig", newline="") as source_file:
        reader = csv.DictReader(source_file)
        columns = set(reader.fieldnames or [])
        missing = sorted(REQUIRED_COLUMNS - columns)
        unexpected = sorted(columns - REQUIRED_COLUMNS)
        if missing:
            raise ValueError(f"encounters.csv is missing columns: {', '.join(missing)}")
        if unexpected:
            raise ValueError(f"encounters.csv has unexpected columns: {', '.join(unexpected)}")

        encounters = []
        for row_number, row in enumerate(reader, 2):
            context = f"encounters.csv row {row_number}"
            if None in row:
                raise ValueError(f"{context}: too many CSV fields; check commas and quoting")
            if any(value is None for value in row.values()):
                raise ValueError(f"{context}: too few CSV fields")
            encounter_id = row["id"].strip()
            if not encounter_id:
                raise ValueError(f"{context}: id is required")
            title = row["title"].strip() or "Untitled"
            media = []
            if row["text"]:
                media.append({"type": "text", "text": row["text"]})
            media.extend(parse_media(row["media"], context))
            encounter = {
                "id": encounter_id,
                "title": title,
                "placeholder": boolean(row["placeholder"], context),
                "place": [
                    coordinate(row["longitude"], "longitude", context),
                    coordinate(row["latitude"], "latitude", context),
                ],
                "time": row["time"].strip(),
                "feeling": row["feeling"].strip(),
                "knowing": row["knowing"].strip(),
                "media": media,
            }
            if row["time_detail"].strip():
                encounter["time_detail"] = row["time_detail"].strip()
            encounters.append(encounter)

    all_placeholders = all(encounter["placeholder"] for encounter in encounters)
    public_export = {
        "generated": True,
        "generated_from": "data/encounters.csv",
        "placeholder": all_placeholders,
    }
    if all_placeholders:
        public_export["notice"] = "All encounters and coordinates in this prototype are placeholders."
    public_export["encounters"] = encounters
    return public_export


def write_exports(encounters: dict) -> None:
    settings = json.loads((ROOT / "data" / "settings.json").read_text(encoding="utf-8"))
    navigation = generate_navigation(encounters["encounters"], calculate(encounters["encounters"]), settings)
    with tempfile.TemporaryDirectory(prefix="desire-path-publish-", dir=ENCOUNTERS_OUTPUT.parent) as temporary_directory:
        temporary_root = Path(temporary_directory)
        encounters_candidate = temporary_root / ENCOUNTERS_OUTPUT.name
        navigation_candidate = temporary_root / NAVIGATION_OUTPUT.name
        encounters_candidate.write_text(json.dumps(encounters, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        navigation_candidate.write_text(json.dumps(navigation, indent=2) + "\n", encoding="utf-8")
        subprocess.run([
            sys.executable,
            str(ROOT / "scripts" / "validate_data.py"),
            "--encounters", str(encounters_candidate),
            "--navigation", str(navigation_candidate),
        ], check=True)
        encounters_candidate.replace(ENCOUNTERS_OUTPUT)
        navigation_candidate.replace(NAVIGATION_OUTPUT)


def main() -> None:
    write_exports(export_encounters())
    print("Public encounter and navigation data were regenerated from data/encounters.csv.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, subprocess.CalledProcessError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
