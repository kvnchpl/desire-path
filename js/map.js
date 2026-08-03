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
  all: "#252724",
  neutral: "#858984",
};

export function activePathColor(dimensions) {
  if (["place", "time", "feeling", "knowing"].every((dimension) => dimensions.includes(dimension))) {
    return dimensionColors.all;
  }
  const chromaticDimensions = dimensions.filter((dimension) => dimension !== "place").sort();
  return dimensionColors[chromaticDimensions.join("+")] || dimensionColors.place;
}

export function dimensionalPathColor(dimensions) {
  return dimensions.length ? activePathColor(dimensions) : dimensionColors.neutral;
}

function addArrowheads(polyline, { color, start = false, end = false, opacity = 0.8 }) {
  polyline.on("add", () => {
    const path = polyline.getElement();
    const svg = path?.ownerSVGElement;
    if (!path || !svg) return;

    const markerId = `path-arrow-${color.slice(1)}-${String(opacity).replace(".", "-")}`;
    let marker = svg.querySelector(`#${markerId}`);
    if (!marker) {
      let definitions = svg.querySelector("defs");
      if (!definitions) {
        definitions = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        svg.prepend(definitions);
      }
      marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
      marker.setAttribute("id", markerId);
      marker.setAttribute("viewBox", "0 0 8 8");
      marker.setAttribute("refX", "14");
      marker.setAttribute("refY", "4");
      marker.setAttribute("markerWidth", "8");
      marker.setAttribute("markerHeight", "8");
      marker.setAttribute("markerUnits", "userSpaceOnUse");
      marker.setAttribute("orient", "auto-start-reverse");
      const arrow = document.createElementNS("http://www.w3.org/2000/svg", "path");
      arrow.setAttribute("d", "M0 0 L8 4 L0 8 Z");
      arrow.setAttribute("fill", color);
      arrow.setAttribute("fill-opacity", String(opacity));
      marker.append(arrow);
      definitions.append(marker);
    }

    if (start) path.setAttribute("marker-start", `url(#${markerId})`);
    if (end) path.setAttribute("marker-end", `url(#${markerId})`);
  });
}

function markerIcon(kind) {
  return L.divIcon({
    className: `encounter-marker encounter-marker--${kind}`,
    html: "<span aria-hidden=\"true\"></span>",
    iconSize: kind === "current" ? [22, 22] : [16, 16],
    iconAnchor: kind === "current" ? [11, 11] : [8, 8],
  });
}

function addNodeId(marker, id, visible, layer) {
  if (!visible) return;
  L.tooltip({
    className: "node-id",
    direction: "top",
    offset: [0, -8],
    permanent: true,
    interactive: false,
  }).setLatLng(marker.getLatLng()).setContent(id).addTo(layer);
}

function bindEncounterPreview(marker, text) {
  marker.bindTooltip(text, {
    className: "encounter-preview",
    direction: "top",
    offset: [0, -12],
    opacity: 1,
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
  const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  let touchPreviewMarker = null;
  let hasFit = false;

  map.on("click", () => {
    touchPreviewMarker?.closeTooltip();
    touchPreviewMarker = null;
  });

  function render(current, neighbors, encounterById, options = {}) {
    layer.clearLayers();
    touchPreviewMarker = null;
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
        const pathColor = dimensionalPathColor(pair.near);
        const debuggingPath = L.polyline(
          [L.latLng(left.place[1], left.place[0]), L.latLng(right.place[1], right.place[0])],
          { color: pathColor, opacity: 0.32, weight: 0.9, interactive: false },
        );
        addArrowheads(debuggingPath, {
          color: pathColor,
          start: pair.b_to_a,
          end: pair.a_to_b,
          opacity: 0.68,
        });
        debuggingPath.addTo(layer);
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
        addNodeId(marker, id, options.showNodeIds, layer);
      });
    }

    neighbors.forEach(({ id, bridge }) => {
      const neighbor = encounterById.get(id);
      const latLng = L.latLng(neighbor.place[1], neighbor.place[0]);
      visibleLatLngs.push(latLng);
      const visiblePath = L.polyline(
        [currentLatLng, latLng],
        { ...pathStyle, color, dashArray: bridge ? "4 5" : null },
      );
      addArrowheads(visiblePath, { color, end: true });
      visiblePath.addTo(layer);
      const marker = L.marker(latLng, {
        icon: markerIcon("reachable"),
        keyboard: true,
        alt: neighbor.title.toUpperCase(),
      });
      bindEncounterPreview(marker, neighbor.title.toUpperCase());
      marker.on("click", () => {
        if (!supportsHover && touchPreviewMarker !== marker) {
          touchPreviewMarker?.closeTooltip();
          marker.openTooltip();
          touchPreviewMarker = marker;
          return;
        }
        touchPreviewMarker = null;
        onNavigate(id);
      });
      marker.addTo(layer);
      addNodeId(marker, id, options.showNodeIds, layer);
    });

    const currentMarker = L.marker(currentLatLng, {
      icon: markerIcon("current"),
      keyboard: true,
      alt: `current: ${current.title.toUpperCase()}`,
      zIndexOffset: 1000,
    }).addTo(layer);
    bindEncounterPreview(currentMarker, `CURRENT — ${current.title.toUpperCase()}`);
    currentMarker.on("click", () => {
      if (supportsHover) return;
      touchPreviewMarker?.closeTooltip();
      currentMarker.openTooltip();
      touchPreviewMarker = currentMarker;
    });
    addNodeId(currentMarker, current.id, options.showNodeIds, layer);

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
