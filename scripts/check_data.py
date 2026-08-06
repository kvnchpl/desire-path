#!/usr/bin/env python3
"""Validate authored CSV data and confirm generated files are current."""

from __future__ import annotations

import json
import sys

from calculate_navigation import generate_navigation
from calculate_paths import calculate
from export_data import ENCOUNTERS_OUTPUT, NAVIGATION_OUTPUT, ROOT, export_encounters
from validate_data import validate


def main() -> None:
    try:
        expected_encounters = export_encounters()
        settings = json.loads((ROOT / "data" / "settings.json").read_text(encoding="utf-8"))
        expected_navigation = generate_navigation(
            expected_encounters["encounters"],
            calculate(expected_encounters["encounters"]),
            settings,
        )
        actual_encounters = json.loads(ENCOUNTERS_OUTPUT.read_text(encoding="utf-8"))
        actual_navigation = json.loads(NAVIGATION_OUTPUT.read_text(encoding="utf-8"))
        errors = validate()
        if actual_encounters != expected_encounters or actual_navigation != expected_navigation:
            errors.append("generated data is out of date; run npm run export:data")
    except (OSError, ValueError, json.JSONDecodeError, KeyError, TypeError) as error:
        errors = [str(error)]

    if errors:
        for error in errors:
            print(f"error: {error}", file=sys.stderr)
        raise SystemExit(1)
    print("DESIRE PATH authored and generated data are valid and in sync.")


if __name__ == "__main__":
    main()
