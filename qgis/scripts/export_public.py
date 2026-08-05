#!/usr/bin/env python3
"""Export web-safe encounter and distance data from the QGIS GeoPackage."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from calculate_paths import calculate
from calculate_navigation import generate_navigation

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "qgis" / "encounters.gpkg"
ENCOUNTERS_OUTPUT = ROOT / "data" / "encounters.json"
NAVIGATION_OUTPUT = ROOT / "data" / "navigation.json"
LAYER = "encounters"


def qgis_binary(name: str) -> Path:
    discovered = shutil.which(name)
    if discovered:
        return Path(discovered)
    for applications_directory in (Path("/Applications"), Path.home() / "Applications"):
        macos_candidate = applications_directory / "QGIS.app" / "Contents" / "MacOS" / name
        if macos_candidate.is_file():
            return macos_candidate
    raise RuntimeError(f"Could not find {name}. Install QGIS or add its command-line tools to PATH.")


def qgis_environment() -> dict[str, str]:
    environment = os.environ.copy()
    for applications_directory in (Path("/Applications"), Path.home() / "Applications"):
        resources = applications_directory / "QGIS.app" / "Contents" / "Resources" / "qgis"
        if resources.is_dir():
            environment.setdefault("PROJ_DATA", str(resources / "proj"))
            environment.setdefault("GDAL_DATA", str(resources / "gdal"))
            break
    return environment


def export_encounters() -> dict:
    with tempfile.TemporaryDirectory(prefix="desire-path-export-") as temporary_directory:
        temporary_output = Path(temporary_directory) / "encounters.geojson"
        subprocess.run(
            [
                str(qgis_binary("ogr2ogr")),
                "-f",
                "GeoJSON",
                str(temporary_output),
                str(SOURCE),
                LAYER,
                "-t_srs",
                "EPSG:4326",
                "-lco",
                "RFC7946=YES",
            ],
            check=True,
            env=qgis_environment(),
        )
        exported = json.loads(temporary_output.read_text(encoding="utf-8"))

    encounters = []
    for feature in exported["features"]:
        properties = feature.get("properties", {})
        encounter_id = properties["id"]
        title = properties.get("title")
        if not isinstance(title, str) or not title.strip():
            title = "Untitled"
        media = properties.get("media")
        if isinstance(media, str):
            media = json.loads(media) if media.strip() else []
        if media is None:
            media = []
        encounters.append(
            {
                "id": encounter_id,
                "title": title,
                "placeholder": properties["placeholder"],
                "place": feature["geometry"]["coordinates"],
                "time": properties["time"],
                "feeling": properties["feeling"],
                "knowing": properties["knowing"],
                "media": media,
            }
        )
    all_placeholders = all(encounter["placeholder"] is True for encounter in encounters)
    public_export = {
        "generated": True,
        "generated_from": "qgis/encounters.gpkg",
        "placeholder": all_placeholders,
    }
    if all_placeholders:
        public_export["notice"] = "All encounters and coordinates in this prototype are placeholders."
    public_export["encounters"] = encounters
    return public_export


def write_exports(encounters: dict) -> None:
    settings = json.loads((ROOT / "data" / "settings.json").read_text(encoding="utf-8"))
    pairs = calculate(encounters["encounters"])
    navigation = generate_navigation(
        encounters["encounters"],
        pairs,
        settings,
    )
    with tempfile.TemporaryDirectory(prefix="desire-path-publish-", dir=ENCOUNTERS_OUTPUT.parent) as temporary_directory:
        temporary_root = Path(temporary_directory)
        encounters_candidate = temporary_root / ENCOUNTERS_OUTPUT.name
        navigation_candidate = temporary_root / NAVIGATION_OUTPUT.name
        encounters_candidate.write_text(json.dumps(encounters, indent=2) + "\n", encoding="utf-8")
        navigation_candidate.write_text(json.dumps(navigation, indent=2) + "\n", encoding="utf-8")
        subprocess.run(
            [
                sys.executable,
                str(ROOT / "scripts" / "validate_data.py"),
                "--encounters",
                str(encounters_candidate),
                "--navigation",
                str(navigation_candidate),
            ],
            check=True,
        )
        encounters_candidate.replace(ENCOUNTERS_OUTPUT)
        navigation_candidate.replace(NAVIGATION_OUTPUT)


def main() -> None:
    write_exports(export_encounters())
    print("Public encounter and navigation data were regenerated from QGIS.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, subprocess.CalledProcessError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
