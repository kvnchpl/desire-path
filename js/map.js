const pathStyle = {
  opacity: 0.64,
  weight: 1.5,
};

const dimensionColors = {
  place: "#b8bbb5",
  time: "#a9544f",
  feeling: "#c4a447",
  knowing: "#536f8f",
  "feeling+time": "#b66f3d",
  "knowing+time": "#785f79",
  "feeling+knowing": "#697c5a",
  "feeling+knowing+time": "#4f514e",
  neutral: "#858984",
};

export function activePathColor(dimensions) {
  const chromaticDimensions = dimensions.filter((dimension) => dimension !== "place").sort();
  return dimensionColors[chromaticDimensions.join("+")] || dimensionColors.place;
}

function percentileThreshold(pairs, dimension, percentage) {
  const values = pairs.map((pair) => pair[dimension]).sort((left, right) => left - right);
  const rank = Math.max(0, Math.ceil((percentage / 100) * values.length) - 1);
  return values[rank] ?? 0;
}

export function dimensionalPathColor(pair, pairs, percentage) {
  const dimensions = ["place", "time", "feeling", "knowing"].filter(
    (dimension) => pair[dimension] <= percentileThreshold(pairs, dimension, percentage),
  );
  return dimensions.length ? activePathColor(dimensions) : dimensionColors.neutral;
}

function markerIcon(kind) {
  return L.divIcon({
    className: `encounter-marker encounter-marker--${kind}`,
    html: "<span aria-hidden=\"true\"></span>",
    iconSize: kind === "current" ? [22, 22] : [16, 16],
    iconAnchor: kind === "current" ? [11, 11] : [8, 8],
  });
}

function addNodeId(marker, id, visible) {
  if (!visible) return;
  marker.bindTooltip(id, {
    className: "node-id",
    direction: "top",
    offset: [0, -8],
    permanent: true,
  });
}

export function createEncounterMap(element, settings, onNavigate) {
  element.querySelector(".map-fallback")?.remove();
  const map = L.map(element, { zoomControl: false, attributionControl: false, maxZoom: settings.map.maximum_zoom });
  fetch(settings.map.coastline)
    .then((response) => {
      if (!response.ok) throw new Error("Could not load the coastline");
      return response.json();
    })
    .then((coastline) => {
      L.geoJSON(coastline, {
        interactive: false,
        style: { color: "#6e736d", opacity: 0.28, weight: 0.8 },
      }).addTo(map).bringToBack();
    })
    .catch((error) => console.warn(error));
  const layer = L.layerGroup().addTo(map);
  let hasFit = false;

  function render(current, neighbors, encounterById, options = {}) {
    layer.clearLayers();
    const color = activePathColor(options.dimensions || []);
    element.style.setProperty("--active-path-color", color);
    const currentLatLng = L.latLng(current.place[1], current.place[0]);
    const visibleLatLngs = [currentLatLng];
    const visibleIds = new Set([current.id, ...neighbors.map(({ id }) => id)]);

    if (options.showAllPaths) {
      options.allPaths.forEach((pair) => {
        const { a, b } = pair;
        const left = encounterById.get(a);
        const right = encounterById.get(b);
        const pathColor = dimensionalPathColor(pair, options.allPairs, settings.visibility_percentile);
        L.polyline(
          [L.latLng(left.place[1], left.place[0]), L.latLng(right.place[1], right.place[0])],
          { color: pathColor, opacity: 0.2, weight: 0.75, interactive: false },
        ).addTo(layer);
      });
    }

    if (options.showAllNodes || options.showAllPaths) {
      encounterById.forEach((encounter, id) => {
        if (visibleIds.has(id)) return;
        const latLng = L.latLng(encounter.place[1], encounter.place[0]);
        const marker = L.marker(latLng, {
          icon: markerIcon("context"),
          interactive: false,
          keyboard: false,
          alt: "",
        }).addTo(layer);
        addNodeId(marker, id, options.showNodeIds);
      });
    }

    neighbors.forEach(({ id, bridge }) => {
      const neighbor = encounterById.get(id);
      const latLng = L.latLng(neighbor.place[1], neighbor.place[0]);
      visibleLatLngs.push(latLng);
      L.polyline([currentLatLng, latLng], { ...pathStyle, color, dashArray: bridge ? "4 5" : null }).addTo(layer);
      const marker = L.marker(latLng, {
        icon: markerIcon("reachable"),
        keyboard: true,
        title: neighbor.title.toUpperCase(),
        alt: neighbor.title.toUpperCase(),
      });
      marker.on("click", () => onNavigate(id));
      marker.addTo(layer);
      addNodeId(marker, id, options.showNodeIds);
    });

    const currentMarker = L.marker(currentLatLng, {
      icon: markerIcon("current"),
      keyboard: true,
      title: `current: ${current.title.toUpperCase()}`,
      alt: `current: ${current.title.toUpperCase()}`,
      zIndexOffset: 1000,
    }).addTo(layer);
    addNodeId(currentMarker, current.id, options.showNodeIds);

    const bounds = L.latLngBounds(visibleLatLngs);
    if (!hasFit) {
      map.fitBounds(bounds.pad(0.28), { maxZoom: 11, animate: false });
      hasFit = true;
    } else {
      map.panInsideBounds(bounds.pad(0.18), { animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches });
    }
  }

  return { render };
}
