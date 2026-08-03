export function pairKey(a, b) {
  return [a, b].sort().join("|");
}

export function createDistanceIndex(pairs) {
  return new Map(pairs.map((pair) => [pairKey(pair.a, pair.b), pair]));
}

export function compositeDistance(pair, dimensions) {
  return dimensions.reduce((sum, dimension) => sum + pair[dimension], 0) / dimensions.length;
}

function percentile(values, percentage) {
  if (!values.length) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const rank = Math.max(0, Math.ceil((percentage / 100) * ordered.length) - 1);
  return ordered[rank];
}

function connectedComponents(ids, edges) {
  const adjacency = new Map(ids.map((id) => [id, new Set()]));
  edges.forEach(({ a, b }) => {
    adjacency.get(a).add(b);
    adjacency.get(b).add(a);
  });
  const components = [];
  const unseen = new Set(ids);
  while (unseen.size) {
    const first = unseen.values().next().value;
    const component = new Set([first]);
    const queue = [first];
    unseen.delete(first);
    while (queue.length) {
      const id = queue.shift();
      adjacency.get(id).forEach((neighbor) => {
        if (!component.has(neighbor)) {
          component.add(neighbor);
          unseen.delete(neighbor);
          queue.push(neighbor);
        }
      });
    }
    components.push(component);
  }
  return components;
}

function globallyVisibleEdges(ids, pairs, dimensions, percentage) {
  const ranked = pairs
    .map((pair) => ({ ...pair, distance: compositeDistance(pair, dimensions) }))
    .sort((left, right) => left.distance - right.distance || pairKey(left.a, left.b).localeCompare(pairKey(right.a, right.b)));
  const threshold = percentile(ranked.map((pair) => pair.distance), percentage);
  const edges = ranked.filter((pair) => pair.distance <= threshold);
  const bridgeKeys = new Set();

  while (connectedComponents(ids, edges).length > 1) {
    const components = connectedComponents(ids, edges);
    const componentFor = new Map();
    components.forEach((component, index) => component.forEach((id) => componentFor.set(id, index)));
    const bridge = ranked.find((pair) => componentFor.get(pair.a) !== componentFor.get(pair.b));
    if (!bridge) break;
    edges.push(bridge);
    bridgeKeys.add(pairKey(bridge.a, bridge.b));
  }
  return { edges, bridgeKeys, ranked };
}

export function visibleNeighborhood({ currentId, encounterIds, pairs, dimensions, settings }) {
  if (!dimensions.length) throw new Error("At least one dimension is required");
  const { edges, bridgeKeys, ranked } = globallyVisibleEdges(encounterIds, pairs, dimensions, settings.visibility_percentile);
  const visible = new Map();

  edges.forEach((edge) => {
    if (edge.a !== currentId && edge.b !== currentId) return;
    const id = edge.a === currentId ? edge.b : edge.a;
    visible.set(id, { id, distance: edge.distance, bridge: bridgeKeys.has(pairKey(edge.a, edge.b)) });
  });

  const targetMinimum = Math.min(settings.minimum_neighbors, encounterIds.length - 1);
  ranked
    .filter((pair) => pair.a === currentId || pair.b === currentId)
    .forEach((pair) => {
      if (visible.size >= targetMinimum) return;
      const id = pair.a === currentId ? pair.b : pair.a;
      if (!visible.has(id)) visible.set(id, { id, distance: pair.distance, bridge: false });
    });

  const candidates = [...visible.values()].sort((left, right) => {
    if (left.bridge !== right.bridge) return left.bridge ? -1 : 1;
    return left.distance - right.distance || left.id.localeCompare(right.id);
  });
  return candidates.slice(0, settings.maximum_neighbors);
}

export function traversablePaths({ encounterIds, pairs, settings }) {
  const dimensions = ["place", "time", "feeling", "knowing"];
  const traversableKeys = new Set();

  for (let mask = 1; mask < 2 ** dimensions.length; mask += 1) {
    const selected = dimensions.filter((_, index) => mask & (1 << index));
    encounterIds.forEach((currentId) => {
      visibleNeighborhood({ currentId, encounterIds, pairs, dimensions: selected, settings })
        .forEach(({ id }) => traversableKeys.add(pairKey(currentId, id)));
    });
  }

  return pairs.filter(({ a, b }) => traversableKeys.has(pairKey(a, b)));
}
