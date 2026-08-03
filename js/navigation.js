const DIMENSION_ORDER = ["place", "time", "feeling", "knowing"];

export function combinationKey(dimensions) {
  const selected = new Set(dimensions);
  return DIMENSION_ORDER.filter((dimension) => selected.has(dimension)).join("+");
}

export function visibleNeighborhood(navigation, currentId, dimensions) {
  const key = combinationKey(dimensions);
  const combination = navigation.combinations[key];
  if (!combination) throw new Error(`No generated navigation graph for ${key || "an empty selection"}`);
  const neighbors = combination.neighborhoods[currentId];
  if (!neighbors) throw new Error(`No generated neighborhood for ${currentId}`);
  return neighbors;
}
