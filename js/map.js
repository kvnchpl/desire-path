const pathStyle = {
  color: "#59665d",
  opacity: 0.64,
  weight: 1.5,
};

function markerIcon(kind) {
  return L.divIcon({
    className: `encounter-marker encounter-marker--${kind}`,
    html: "<span aria-hidden=\"true\"></span>",
    iconSize: kind === "current" ? [22, 22] : [16, 16],
    iconAnchor: kind === "current" ? [11, 11] : [8, 8],
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

  function render(current, neighbors, encounterById) {
    layer.clearLayers();
    const currentLatLng = L.latLng(current.geometry.coordinates[1], current.geometry.coordinates[0]);
    const visibleLatLngs = [currentLatLng];

    neighbors.forEach(({ id, bridge }) => {
      const neighbor = encounterById.get(id);
      const latLng = L.latLng(neighbor.geometry.coordinates[1], neighbor.geometry.coordinates[0]);
      visibleLatLngs.push(latLng);
      L.polyline([currentLatLng, latLng], { ...pathStyle, dashArray: bridge ? "4 5" : null }).addTo(layer);
      const marker = L.marker(latLng, {
        icon: markerIcon("reachable"),
        keyboard: true,
        title: `Explore ${neighbor.properties.title}`,
        alt: `Explore ${neighbor.properties.title}`,
      });
      marker.on("click", () => onNavigate(id));
      marker.addTo(layer);
    });

    L.marker(currentLatLng, {
      icon: markerIcon("current"),
      keyboard: true,
      title: `Current encounter: ${current.properties.title}`,
      alt: `Current encounter: ${current.properties.title}`,
      zIndexOffset: 1000,
    }).addTo(layer);

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
