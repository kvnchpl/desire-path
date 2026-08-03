#!/usr/bin/env python3
"""Regression tests for validation failures."""

from __future__ import annotations

import copy
import json
import tempfile
import unittest
from pathlib import Path
from typing import Optional

from validate_data import ROOT, validate


class ValidationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary_directory = tempfile.TemporaryDirectory(prefix="desire-path-validation-")
        self.temporary_root = Path(self.temporary_directory.name)
        self.encounters = self.load("data/encounters.json")
        self.navigation = self.load("data/navigation.json")
        self.settings = self.load("data/settings.json")

    def tearDown(self) -> None:
        self.temporary_directory.cleanup()

    @staticmethod
    def load(relative_path: str) -> dict:
        return json.loads((ROOT / relative_path).read_text(encoding="utf-8"))

    def validate_candidates(
        self,
        encounters: Optional[dict] = None,
        navigation: Optional[dict] = None,
        settings: Optional[dict] = None,
    ) -> list[str]:
        candidates = {
            "encounters.json": encounters or self.encounters,
            "navigation.json": navigation or self.navigation,
            "settings.json": settings or self.settings,
        }
        paths = {}
        for name, content in candidates.items():
            path = self.temporary_root / name
            path.write_text(json.dumps(content), encoding="utf-8")
            paths[name] = path
        return validate(paths["encounters.json"], paths["navigation.json"], paths["settings.json"])

    def test_rejects_invalid_neighbor_limits(self) -> None:
        settings = copy.deepcopy(self.settings)
        settings["minimum_neighbors"] = 5
        settings["maximum_neighbors"] = 4
        self.assertIn("minimum_neighbors must not exceed maximum_neighbors", self.validate_candidates(settings=settings))

    def test_rejects_incomplete_map_settings(self) -> None:
        settings = copy.deepcopy(self.settings)
        del settings["map"]["coastline"]
        self.assertIn(
            "settings.map.coastline must be a nonempty relative path",
            self.validate_candidates(settings=settings),
        )

    def test_rejects_non_object_media(self) -> None:
        encounters = copy.deepcopy(self.encounters)
        encounters["encounters"][0]["media"] = ["not an object"]
        self.assertIn("encounter 1, media 1: media entry must be an object", self.validate_candidates(encounters=encounters))

    def test_rejects_noncanonical_near_dimensions(self) -> None:
        navigation = copy.deepcopy(self.navigation)
        navigation["possible_paths"][0]["near"] = ["time", "place"]
        self.assertIn("navigation path 1: invalid near dimensions", self.validate_candidates(navigation=navigation))


if __name__ == "__main__":
    unittest.main()
