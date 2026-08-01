import { renderEncounter } from "./encounter.js";
import { createEncounterMap } from "./map.js";
import { compositeDistance, createDistanceIndex, pairKey, visibleNeighborhood } from "./navigation.js";

const elements = {
  form: document.querySelector("#explore-form"),
  debugShowAll: document.querySelector("#debug-show-all"),
  debugShowIds: document.querySelector("#debug-show-ids"),
  debugShowDistances: document.querySelector("#debug-show-distances"),
  debugDistances: document.querySelector("#debug-distances"),
  debugShowData: document.querySelector("#debug-show-data"),
  debugData: document.querySelector("#debug-data"),
  map: document.querySelector("#map"),
  media: document.querySelector("#encounter-media"),
  retrace: document.querySelector("#retrace"),
  status: document.querySelector("#status"),
  title: document.querySelector("#encounter-title"),
};

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

function selectedDimensions() {
  return [...elements.form.elements.dimension].filter((input) => input.checked).map((input) => input.value);
}

async function start() {
  const [encounters, distances, settings] = await Promise.all([
    loadJson("data/encounters.geojson"),
    loadJson("data/distances.json"),
    loadJson("data/settings.json"),
  ]);
  const encounterById = new Map(encounters.features.map((feature) => [feature.properties.id, feature]));
  const encounterIds = [...encounterById.keys()];
  const distanceByPair = createDistanceIndex(distances.pairs);
  const history = [settings.initial_encounter];
  let currentId = settings.initial_encounter;
  const map = createEncounterMap(elements.map, settings, navigate);

  function renderDistanceDebug(dimensions) {
    elements.debugDistances.hidden = !elements.debugShowDistances.checked;
    if (!elements.debugShowDistances.checked) {
      elements.debugDistances.replaceChildren();
      return;
    }

    const table = document.createElement("table");
    const header = table.createTHead().insertRow();
    ["node", "place", "time", "feeling", "knowing", "composite"].forEach((label) => {
      const cell = document.createElement("th");
      cell.scope = "col";
      cell.textContent = label;
      header.append(cell);
    });
    const body = table.createTBody();
    encounterIds.filter((id) => id !== currentId).forEach((id) => {
      const pair = distanceByPair.get(pairKey(currentId, id));
      const row = body.insertRow();
      const values = [id, pair.place, pair.time, pair.feeling, pair.knowing, compositeDistance(pair, dimensions)];
      values.forEach((value, index) => {
        const cell = row.insertCell();
        cell.textContent = index === 0 ? value : value.toFixed(3);
      });
    });
    elements.debugDistances.replaceChildren(table);
  }

  function renderDataDebug(current) {
    elements.debugData.hidden = !elements.debugShowData.checked;
    elements.debugData.textContent = elements.debugShowData.checked
      ? JSON.stringify({ geometry: current.geometry, ...current.properties }, null, 2)
      : "";
  }

  function render(announcement = "") {
    const current = encounterById.get(currentId);
    const dimensions = selectedDimensions();
    const neighbors = visibleNeighborhood({
      currentId,
      encounterIds,
      pairs: distances.pairs,
      dimensions,
      settings,
    });
    renderEncounter(current, elements);
    renderDataDebug(current);
    map.render(current, neighbors, encounterById, {
      showAllNodes: elements.debugShowAll.checked,
      showNodeIds: elements.debugShowIds.checked,
    });
    renderDistanceDebug(dimensions);
    elements.retrace.disabled = history.length < 2;
    elements.status.textContent = announcement || `${neighbors.length} paths are near.`;
  }

  function navigate(nextId) {
    if (!encounterById.has(nextId) || nextId === currentId) return;
    currentId = nextId;
    history.push(nextId);
    render(`Arrived at ${encounterById.get(nextId).properties.title}.`);
  }

  elements.form.addEventListener("change", (event) => {
    const checked = selectedDimensions();
    if (!checked.length) {
      event.target.checked = true;
      elements.status.textContent = "At least one way of exploring must remain.";
      return;
    }
    render(`Paths now follow ${checked.join(", ")}.`);
  });

  elements.retrace.addEventListener("click", () => {
    if (history.length < 2) return;
    history.pop();
    currentId = history.at(-1);
    render(`Retraced to ${encounterById.get(currentId).properties.title}.`);
  });

  elements.debugShowAll.addEventListener("change", () => {
    render(elements.debugShowAll.checked ? "All node positions are visible." : "Only near node positions are visible.");
  });

  elements.debugShowIds.addEventListener("change", () => {
    render(elements.debugShowIds.checked ? "Node IDs are visible." : "Node IDs are hidden.");
  });

  elements.debugShowDistances.addEventListener("change", () => {
    render(elements.debugShowDistances.checked ? "Distances are visible." : "Distances are hidden.");
  });

  elements.debugShowData.addEventListener("change", () => {
    render(elements.debugShowData.checked ? "Current node data is visible." : "Current node data is hidden.");
  });

  render();
}

start().catch((error) => {
  console.error(error);
  elements.status.textContent = "The landscape could not be opened.";
  elements.map.querySelector(".map-fallback")?.replaceChildren("The landscape could not be opened.");
});
