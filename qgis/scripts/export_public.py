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
ENCOUNTERS_OUTPUT = ROOT / "data" / "encounters.geojson"
DISTANCES_OUTPUT = ROOT / "data" / "distances.json"
LAYER = "encounters"


def qgis_binary(name: str) -> Path:
    discovered = shutil.which(name)
    if discovered:
        return Path(discovered)
    macos_candidate = Path("/Applications/QGIS.app/Contents/MacOS") / name
    if macos_candidate.is_file():
        return macos_candidate
    raise RuntimeError(f"Could not find {name}. Install QGIS or add its command-line tools to PATH.")


def qgis_environment() -> dict[str, str]:
    environment = os.environ.copy()
    resources = Path("/Applications/QGIS.app/Contents/Resources/qgis")
    if resources.is_dir():
        environment.setdefault("PROJ_DATA", str(resources / "proj"))
        environment.setdefault("GDAL_DATA", str(resources / "gdal"))
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

    for feature in exported["features"]:
        properties = feature.get("properties", {})
        if isinstance(properties.get("media"), str):
            properties["media"] = json.loads(properties["media"])
    if all(feature.get("properties", {}).get("placeholder") is True for feature in exported["features"]):
        exported["placeholder"] = True
        exported.setdefault("notice", "All encounters and coordinates in this prototype are fictional placeholders.")
    else:
        exported["placeholder"] = False
        exported.pop("notice", None)
    public_export = {
        "type": "FeatureCollection",
        "schema_version": 2,
        "generated": True,
        "generated_from": "qgis/encounters.gpkg",
        "placeholder": exported["placeholder"],
    }
    if exported.get("notice"):
        public_export["notice"] = exported["notice"]
    public_export["features"] = exported["features"]
    return public_export


def write_exports(encounters: dict) -> None:
    distances = {
        "schema_version": encounters["schema_version"],
        "generated": True,
        "generated_from": "data/encounters.geojson",
        "dimensions": ["place", "time", "feeling", "knowing"],
        "pairs": calculate(encounters["features"]),
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
