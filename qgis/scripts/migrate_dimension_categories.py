#!/usr/bin/env python3
"""Migrate Feeling and Knowing to the seven-category public vocabularies."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

from export_public import qgis_binary, qgis_environment

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "qgis" / "encounters.gpkg"
SCHEMA_VERSION = 5

FEELING_VALUES = ("JOY", "DESIRE", "WONDER", "NOSTALGIA", "GRIEF", "FEAR", "ANGER")
KNOWING_VALUES = ("WITNESSED", "REMEMBERED", "INHERITED", "DOCUMENTED", "DREAMED", "IMAGINED", "UNRESOLVED")

FEELING_MIGRATION = {
    "TENDERNESS": "JOY",
    "SERENITY": "JOY",
    "MELANCHOLY": "GRIEF",
    "LONELINESS": "GRIEF",
    "ANXIETY": "FEAR",
    "DISGUST": "ANGER",
    "ESTRANGEMENT": "FEAR",
    "EERINESS": "FEAR",
    "NUMBNESS": "GRIEF",
    "AMBIVALENCE": "NOSTALGIA",
}
KNOWING_MIGRATION = {
    "ANTICIPATED": "IMAGINED",
    "INFERRED": "DOCUMENTED",
    "GENERATED": "IMAGINED",
}


def migrate_encounters() -> None:
    for field, migration in (("feeling", FEELING_MIGRATION), ("knowing", KNOWING_MIGRATION)):
        for old, new in migration.items():
            subprocess.run(
                [
                    str(qgis_binary("ogrinfo")),
                    str(SOURCE),
                    "-dialect",
                    "SQLite",
                    "-sql",
                    f"UPDATE encounters SET {field} = '{new}' WHERE {field} = '{old}'",
                ],
                check=True,
                env=qgis_environment(),
                stdout=subprocess.DEVNULL,
            )


def reduce_distances(filename: str, categories: tuple[str, ...]) -> None:
    path = ROOT / "data" / filename
    source = json.loads(path.read_text(encoding="utf-8"))
    retained = set(categories)
    source["schema_version"] = SCHEMA_VERSION
    source["pairs"] = [
        pair for pair in source["pairs"]
        if pair["a"] in retained and pair["b"] in retained
    ]
    path.write_text(json.dumps(source, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    migrate_encounters()
    reduce_distances("feeling-distances.json", FEELING_VALUES)
    reduce_distances("knowing-distances.json", KNOWING_VALUES)
    print("Feeling and Knowing categories were migrated to seven values each.")
