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

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "qgis" / "encounters.gpkg"
ENCOUNTERS_OUTPUT = ROOT / "data" / "encounters.json"
DISTANCES_OUTPUT = ROOT / "data" / "distances.json"
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
        if isinstance(properties.get("media"), str):
            properties["media"] = json.loads(properties["media"])
        encounters.append(
            {
                "id": properties["id"],
                "title": properties["title"],
                "placeholder": properties["placeholder"],
                "place": feature["geometry"]["coordinates"],
                "time": properties["time"],
                "feeling": properties["feeling"],
                "knowing": properties["knowing"],
                "media": properties["media"],
            }
        )
    all_placeholders = all(encounter["placeholder"] is True for encounter in encounters)
    public_export = {
        "schema_version": 4,
        "generated": True,
        "generated_from": "qgis/encounters.gpkg",
        "placeholder": all_placeholders,
    }
    if all_placeholders:
        public_export["notice"] = "All encounters and coordinates in this prototype are fictional placeholders."
    public_export["encounters"] = encounters
    return public_export


def write_exports(encounters: dict) -> None:
    distances = {
        "schema_version": encounters["schema_version"],
        "generated": True,
        "generated_from": "data/encounters.json",
        "dimensions": ["place", "time", "feeling", "knowing"],
        "pairs": calculate(encounters["encounters"]),
    }
    ENCOUNTERS_OUTPUT.write_text(json.dumps(encounters, indent=2) + "\n", encoding="utf-8")
    DISTANCES_OUTPUT.write_text(json.dumps(distances, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    write_exports(export_encounters())
    subprocess.run([sys.executable, str(ROOT / "scripts" / "validate_data.py")], check=True)
    print("Public encounter and distance data were regenerated from QGIS.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, subprocess.CalledProcessError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
