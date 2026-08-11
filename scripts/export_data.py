#!/usr/bin/env python3
"""Generate public encounter and navigation JSON from the authored CSV."""

from __future__ import annotations

import csv
import json
import subprocess
import sys
import tempfile
from collections import Counter
from pathlib import Path

from calculate_navigation import generate_navigation
from calculate_paths import calculate

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "encounters.csv"
ENCOUNTERS_OUTPUT = ROOT / "data" / "encounters.json"
NAVIGATION_OUTPUT = ROOT / "data" / "navigation.json"
SUMMARY_OUTPUT = ROOT / "data" / "encounters-summary.md"
FEELING_DISTANCES = ROOT / "data" / "feeling-distances.json"
KNOWING_DISTANCES = ROOT / "data" / "knowing-distances.json"
MEDIA_TYPES = ("text", "image", "audio", "video")
TIME_FORMS = ("Dated (YYYY-MM)", "INDETERMINATE", "ATEMPORAL")
REQUIRED_COLUMNS = {
    "id", "title", "longitude", "latitude",
    "time", "feeling", "knowing", "media",
}


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
            media = parse_media(row["media"], context)
            encounter = {
                "id": encounter_id,
                "title": title,
                "place": [
                    coordinate(row["longitude"], "longitude", context),
                    coordinate(row["latitude"], "latitude", context),
                ],
                "time": row["time"].strip(),
                "feeling": row["feeling"].strip(),
                "knowing": row["knowing"].strip(),
                "media": media,
            }
            encounters.append(encounter)

    public_export = {
        "generated": True,
        "generated_from": "data/encounters.csv",
    }
    public_export["encounters"] = encounters
    return public_export


def schema_values(path: Path) -> list[str]:
    source = json.loads(path.read_text(encoding="utf-8"))
    values: list[str] = []
    for pair in source["pairs"]:
        for value in (pair["a"], pair["b"]):
            if value not in values:
                values.append(value)
    return values


def percentage(count: int, total: int) -> str:
    return f"{count / total:.1%}" if total else "0.0%"


def markdown(value: object) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ")


def abridged_media(media: list[dict]) -> str:
    parts = []
    for item in media:
        media_type = item.get("type", "unknown")
        if media_type == "text":
            excerpt = " ".join(item.get("text", "").split())
            if len(excerpt) > 48:
                excerpt = excerpt[:47].rstrip() + "…"
            parts.append(f'text: “{excerpt}”')
        else:
            parts.append(media_type)
    return ", ".join(parts) or "—"


def distribution_table(counts: Counter, values: list[str], total: int) -> list[str]:
    lines = ["| Value | Encounters | Share |", "|---|---:|---:|"]
    for value in values:
        count = counts[value]
        lines.append(f"| `{value}` | {count} | {percentage(count, total)} |")
    return lines


def coverage_row(name: str, counts: Counter, values: list[str]) -> str:
    covered = sum(counts[value] > 0 for value in values)
    missing = [f"`{value}`" for value in values if not counts[value]]
    return f"| {name} | {covered}/{len(values)} | {', '.join(missing) if missing else 'None'} |"


def generate_summary(encounters: list[dict]) -> str:
    feeling_values = schema_values(FEELING_DISTANCES)
    knowing_values = schema_values(KNOWING_DISTANCES)
    feeling_counts = Counter(encounter["feeling"] for encounter in encounters)
    knowing_counts = Counter(encounter["knowing"] for encounter in encounters)
    time_counts = Counter(encounter["time"] for encounter in encounters)
    time_form_counts = Counter(
        encounter["time"] if encounter["time"] in TIME_FORMS else "Dated (YYYY-MM)"
        for encounter in encounters
    )
    media_counts = Counter(
        item.get("type")
        for encounter in encounters
        for item in encounter["media"]
    )
    media_encounter_counts = Counter(
        media_type
        for encounter in encounters
        for media_type in set(item.get("type") for item in encounter["media"])
    )
    total = len(encounters)
    lines = [
        "# Encounter Summary",
        "",
        "Generated from `data/encounters.csv`. Do not edit this file by hand.",
        "",
        "## Coverage",
        "",
        f"**{total} encounters** across **{len(time_counts)} authored Time values** and "
        f"**{len({tuple(encounter['place']) for encounter in encounters})} unique places**.",
        "",
        "| Dimension or field | Values covered | Missing schema values |",
        "|---|---:|---|",
        coverage_row("Feeling", feeling_counts, feeling_values),
        coverage_row("Knowing", knowing_counts, knowing_values),
        coverage_row("Time form", time_form_counts, list(TIME_FORMS)),
        coverage_row("Media type", media_counts, list(MEDIA_TYPES)),
        "",
        "## Encounters",
        "",
        "| ID | Title | Time | Feeling | Knowing | Place (lat, lon) | Content (abridged) |",
        "|---|---|---|---|---|---|---|",
    ]
    for encounter in encounters:
        longitude, latitude = encounter["place"]
        lines.append(
            f"| `{markdown(encounter['id'])}` | {markdown(encounter['title'])} | "
            f"`{markdown(encounter['time'])}` | `{markdown(encounter['feeling'])}` | "
            f"`{markdown(encounter['knowing'])}` | {latitude:.6f}, {longitude:.6f} | "
            f"{markdown(abridged_media(encounter['media']))} |"
        )

    lines.extend(["", "## Feeling distribution", ""])
    lines.extend(distribution_table(feeling_counts, feeling_values, total))
    lines.extend(["", "## Knowing distribution", ""])
    lines.extend(distribution_table(knowing_counts, knowing_values, total))
    lines.extend(["", "## Time distribution", "", "### Field forms", ""])
    lines.extend(distribution_table(time_form_counts, list(TIME_FORMS), total))
    lines.extend(["", "### Authored values", ""])
    lines.extend(distribution_table(time_counts, sorted(time_counts), total))
    longitudes = [encounter["place"][0] for encounter in encounters]
    latitudes = [encounter["place"][1] for encounter in encounters]
    lines.extend([
        "",
        "## Place distribution",
        "",
        "| Measure | Latitude | Longitude |",
        "|---|---:|---:|",
        f"| Minimum | {min(latitudes):.6f} | {min(longitudes):.6f} |",
        f"| Maximum | {max(latitudes):.6f} | {max(longitudes):.6f} |",
        f"| Span | {max(latitudes) - min(latitudes):.6f}° | {max(longitudes) - min(longitudes):.6f}° |",
        f"| Mean | {sum(latitudes) / total:.6f} | {sum(longitudes) / total:.6f} |",
    ])
    lines.extend([
        "",
        "## Media distribution",
        "",
        "| Type | Items | Encounters containing type | Share of encounters |",
        "|---|---:|---:|---:|",
    ])
    for media_type in MEDIA_TYPES:
        encounter_count = media_encounter_counts[media_type]
        lines.append(
            f"| `{media_type}` | {media_counts[media_type]} | {encounter_count} | "
            f"{percentage(encounter_count, total)} |"
        )
    return "\n".join(lines) + "\n"


def write_exports(encounters: dict) -> None:
    settings = json.loads((ROOT / "data" / "settings.json").read_text(encoding="utf-8"))
    navigation = generate_navigation(encounters["encounters"], calculate(encounters["encounters"]), settings)
    summary = generate_summary(encounters["encounters"])
    with tempfile.TemporaryDirectory(prefix="desire-path-publish-", dir=ENCOUNTERS_OUTPUT.parent) as temporary_directory:
        temporary_root = Path(temporary_directory)
        encounters_candidate = temporary_root / ENCOUNTERS_OUTPUT.name
        navigation_candidate = temporary_root / NAVIGATION_OUTPUT.name
        summary_candidate = temporary_root / SUMMARY_OUTPUT.name
        encounters_candidate.write_text(json.dumps(encounters, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        navigation_candidate.write_text(json.dumps(navigation, indent=2) + "\n", encoding="utf-8")
        summary_candidate.write_text(summary, encoding="utf-8")
        subprocess.run([
            sys.executable,
            str(ROOT / "scripts" / "validate_data.py"),
            "--encounters", str(encounters_candidate),
            "--navigation", str(navigation_candidate),
        ], check=True)
        encounters_candidate.replace(ENCOUNTERS_OUTPUT)
        navigation_candidate.replace(NAVIGATION_OUTPUT)
        summary_candidate.replace(SUMMARY_OUTPUT)


def main() -> None:
    write_exports(export_encounters())
    print("Public encounter data, navigation data, and summary were regenerated from data/encounters.csv.")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, subprocess.CalledProcessError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
