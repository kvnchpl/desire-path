import { renderEncounter } from "./encounter.js";
import { createEncounterMap } from "./map.js";
import { compositeDistance, createDistanceIndex, pairKey, visibleNeighborhood } from "./navigation.js";

const elements = {
  form: document.querySelector("#explore-form"),
  settingsShowAll: document.querySelector("#settings-show-all"),
  settingsShowIds: document.querySelector("#settings-show-ids"),
  settingsShowDistances: document.querySelector("#settings-show-distances"),
  settingsDistances: document.querySelector("#settings-distances"),
  settingsShowDetails: document.querySelector("#settings-show-details"),
  settingsData: document.querySelector("#settings-data"),
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

function readableCategory(value) {
  return value.replaceAll("_", " ").toLowerCase();
}

function readablePlace([longitude, latitude]) {
  const northSouth = latitude >= 0 ? "n" : "s";
  const eastWest = longitude >= 0 ? "e" : "w";
  return `${Math.abs(latitude).toFixed(3)}° ${northSouth}, ${Math.abs(longitude).toFixed(3)}° ${eastWest}`;
}

async function start() {
  const [encounters, distances, settings] = await Promise.all([
    loadJson("data/encounters.json"),
    loadJson("data/distances.json"),
    loadJson("data/settings.json"),
  ]);
  const encounterById = new Map(encounters.encounters.map((encounter) => [encounter.id, encounter]));
  const encounterIds = [...encounterById.keys()];
  const distanceByPair = createDistanceIndex(distances.pairs);
  const history = [settings.initial_encounter];
  let currentId = settings.initial_encounter;
  const map = createEncounterMap(elements.map, settings, navigate);

  function renderDistanceSettings(dimensions) {
    elements.settingsDistances.hidden = !elements.settingsShowDistances.checked;
    if (!elements.settingsShowDistances.checked) {
      elements.settingsDistances.replaceChildren();
      return;
    }

    const table = document.createElement("table");
    const caption = table.createCaption();
    caption.textContent = `distance from ${encounterById.get(currentId).title.toUpperCase()}; 0 is near, 1 is far`;
    const header = table.createTHead().insertRow();
    ["encounter", "place", "time", "feeling", "knowing", "combined"].forEach((label) => {
      const cell = document.createElement("th");
      cell.scope = "col";
      cell.textContent = label;
      header.append(cell);
    });
    const body = table.createTBody();
    encounterIds.filter((id) => id !== currentId).forEach((id) => {
      const pair = distanceByPair.get(pairKey(currentId, id));
      const row = body.insertRow();
      const values = [encounterById.get(id).title.toUpperCase(), pair.place, pair.time, pair.feeling, pair.knowing, compositeDistance(pair, dimensions)];
      values.forEach((value, index) => {
        const cell = row.insertCell();
        cell.textContent = index === 0 ? value : value.toFixed(3);
      });
    });
    elements.settingsDistances.replaceChildren(table);
  }

  function renderEncounterDetails(current) {
    elements.settingsData.hidden = !elements.settingsShowDetails.checked;
    if (!elements.settingsShowDetails.checked) {
      elements.settingsData.replaceChildren();
      return;
    }

    const table = document.createElement("table");
    const body = table.createTBody();
    const mediaTypes = [...new Set(current.media.map(({ type }) => type))].join(", ");
    const rows = [
      ["title", current.title.toUpperCase()],
      ["id", current.id],
      ["place", readablePlace(current.place)],
      ["time", readableCategory(current.time)],
      ["feeling", readableCategory(current.feeling)],
      ["knowing", readableCategory(current.knowing)],
      ["media", mediaTypes],
      ["sample", current.placeholder ? "yes" : "no"],
    ];
    rows.forEach(([label, value]) => {
      const row = body.insertRow();
      const heading = document.createElement("th");
      heading.scope = "row";
      heading.textContent = label;
      row.append(heading);
      row.insertCell().textContent = value;
    });
    elements.settingsData.replaceChildren(table);
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
    renderEncounterDetails(current);
    map.render(current, neighbors, encounterById, {
      showAllNodes: elements.settingsShowAll.checked,
      showNodeIds: elements.settingsShowIds.checked,
    });
    renderDistanceSettings(dimensions);
    elements.retrace.disabled = history.length < 2;
    elements.status.textContent = announcement || `${neighbors.length} paths are near.`;
  }

  function navigate(nextId) {
    if (!encounterById.has(nextId) || nextId === currentId) return;
    currentId = nextId;
    history.push(nextId);
    render(`Arrived at ${encounterById.get(nextId).title}.`);
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
    render(`Retraced to ${encounterById.get(currentId).title}.`);
  });

  elements.settingsShowAll.addEventListener("change", () => {
    render(elements.settingsShowAll.checked ? "Every encounter position is visible." : "Only nearby encounter positions are visible.");
  });

  elements.settingsShowIds.addEventListener("change", () => {
    render(elements.settingsShowIds.checked ? "Encounter IDs are visible." : "Encounter IDs are hidden.");
  });

  elements.settingsShowDistances.addEventListener("change", () => {
    render(elements.settingsShowDistances.checked ? "Distance comparison is visible." : "Distance comparison is hidden.");
  });

  elements.settingsShowDetails.addEventListener("change", () => {
    render(elements.settingsShowDetails.checked ? "Current encounter details are visible." : "Current encounter details are hidden.");
  });

  render();
}

start().catch((error) => {
  console.error(error);
  elements.status.textContent = "The landscape could not be opened.";
  elements.map.querySelector(".map-fallback")?.replaceChildren("The landscape could not be opened.");
});
