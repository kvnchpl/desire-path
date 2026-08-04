#!/usr/bin/env python3
"""Generate every public neighborhood graph from pairwise encounter distances."""

from __future__ import annotations

import math

DIMENSIONS = ("place", "time", "feeling", "knowing")


def pair_key(left: str, right: str) -> str:
    return "|".join(sorted((left, right)))


def composite_distance(pair: dict, dimensions: tuple[str, ...]) -> float:
    return sum(pair[dimension] for dimension in dimensions) / len(dimensions)


def percentile(values: list[float], percentage: float) -> float:
    if not values:
        return 0
    ordered = sorted(values)
    rank = max(0, math.ceil((percentage / 100) * len(ordered)) - 1)
    return ordered[rank]


def connected_components(encounter_ids: list[str], edges: list[dict]) -> list[set[str]]:
    adjacency = {encounter_id: set() for encounter_id in encounter_ids}
    for edge in edges:
        adjacency[edge["a"]].add(edge["b"])
        adjacency[edge["b"]].add(edge["a"])
    unseen = set(encounter_ids)
    components = []
    while unseen:
        first = min(unseen)
        component = {first}
        queue = [first]
        unseen.remove(first)
        while queue:
            current = queue.pop(0)
            for neighbor in adjacency[current]:
                if neighbor not in component:
                    component.add(neighbor)
                    unseen.discard(neighbor)
                    queue.append(neighbor)
        components.append(component)
    return components


def global_graph(encounter_ids: list[str], pairs: list[dict], dimensions: tuple[str, ...], percentage: float) -> dict:
    ranked = [dict(pair, distance=composite_distance(pair, dimensions)) for pair in pairs]
    ranked.sort(key=lambda pair: (pair["distance"], pair_key(pair["a"], pair["b"])))
    threshold = percentile([pair["distance"] for pair in ranked], percentage)
    edges = [pair for pair in ranked if pair["distance"] <= threshold]
    bridge_keys: set[str] = set()

    while len(connected_components(encounter_ids, edges)) > 1:
        components = connected_components(encounter_ids, edges)
        component_for = {
            encounter_id: index
            for index, component in enumerate(components)
            for encounter_id in component
        }
        bridge = next(
            (pair for pair in ranked if component_for[pair["a"]] != component_for[pair["b"]]),
            None,
        )
        if bridge is None:
            break
        edges.append(bridge)
        bridge_keys.add(pair_key(bridge["a"], bridge["b"]))

    return {"ranked": ranked, "edges": edges, "bridge_keys": bridge_keys, "threshold": threshold}


def neighborhoods(encounter_ids: list[str], graph: dict, settings: dict) -> dict[str, list[dict]]:
    visible_by_id = {encounter_id: {} for encounter_id in encounter_ids}
    ranked_by_id = {encounter_id: [] for encounter_id in encounter_ids}
    for edge in graph["edges"]:
        key = pair_key(edge["a"], edge["b"])
        for current_id, neighbor_id in ((edge["a"], edge["b"]), (edge["b"], edge["a"])):
            visible_by_id[current_id][neighbor_id] = {
                "id": neighbor_id,
                "distance": edge["distance"],
                "bridge": key in graph["bridge_keys"],
            }
    for pair in graph["ranked"]:
        ranked_by_id[pair["a"]].append((pair["b"], pair))
        ranked_by_id[pair["b"]].append((pair["a"], pair))

    result = {}
    for current_id in encounter_ids:
        visible = dict(visible_by_id[current_id])
        target_minimum = min(settings["minimum_neighbors"], len(encounter_ids) - 1)
        for neighbor_id, pair in ranked_by_id[current_id]:
            if len(visible) >= target_minimum:
                break
            visible.setdefault(neighbor_id, {
                "id": neighbor_id,
                "distance": pair["distance"],
                "bridge": False,
            })

        candidates = sorted(
            visible.values(),
            key=lambda neighbor: (not neighbor["bridge"], neighbor["distance"], neighbor["id"]),
        )[:settings["maximum_neighbors"]]
        result[current_id] = [
            {
                "id": neighbor["id"],
                "distance": round(neighbor["distance"], 6),
                "bridge": neighbor["bridge"],
            }
            for neighbor in candidates
        ]
    return result


def generate_navigation(encounters: list[dict], pairs: list[dict], settings: dict) -> dict:
    encounter_ids = [encounter["id"] for encounter in encounters]
    combinations = {}
    single_dimension_thresholds = {}

    for mask in range(1, 2 ** len(DIMENSIONS)):
        selected = tuple(dimension for index, dimension in enumerate(DIMENSIONS) if mask & (1 << index))
        key = "+".join(selected)
        graph = global_graph(encounter_ids, pairs, selected, settings["visibility_percentile"])
        combinations[key] = {
            "threshold": round(graph["threshold"], 6),
            "neighborhoods": neighborhoods(encounter_ids, graph, settings),
        }
        if len(selected) == 1:
            single_dimension_thresholds[selected[0]] = graph["threshold"]

    pair_index = {pair_key(pair["a"], pair["b"]): pair for pair in pairs}
    directions = {}
    for combination in combinations.values():
        for current_id, neighbors in combination["neighborhoods"].items():
            for neighbor in neighbors:
                key = pair_key(current_id, neighbor["id"])
                pair = pair_index[key]
                direction = directions.setdefault(key, {"a_to_b": False, "b_to_a": False})
                if current_id == pair["a"]:
                    direction["a_to_b"] = True
                else:
                    direction["b_to_a"] = True

    possible_paths = []
    for pair in pairs:
        key = pair_key(pair["a"], pair["b"])
        if key not in directions:
            continue
        possible_paths.append({
            "a": pair["a"],
            "b": pair["b"],
            **directions[key],
            "near": [
                dimension
                for dimension in DIMENSIONS
                if pair[dimension] <= single_dimension_thresholds[dimension]
            ],
        })

    return {
        "generated": True,
        "generated_from": "qgis/encounters.gpkg",
        "dimension_order": list(DIMENSIONS),
        "combinations": combinations,
        "possible_paths": possible_paths,
    }
