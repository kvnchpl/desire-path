import { renderEncounter } from "./encounter.js";
import { createEncounterMap } from "./map.js";
import { visibleNeighborhood } from "./navigation.js";

const elements = {
  form: document.querySelector("#explore-form"),
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
  const history = [settings.initial_encounter];
  let currentId = settings.initial_encounter;
  const map = createEncounterMap(elements.map, settings, navigate);

  function render(announcement = "") {
    const current = encounterById.get(currentId);
    const neighbors = visibleNeighborhood({
      currentId,
      encounterIds,
      pairs: distances.pairs,
      dimensions: selectedDimensions(),
      settings,
    });
    renderEncounter(current, elements);
    map.render(current, neighbors, encounterById);
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

  render();
}

start().catch((error) => {
  console.error(error);
  elements.status.textContent = "The landscape could not be opened.";
  elements.map.querySelector(".map-fallback")?.replaceChildren("The landscape could not be opened.");
});
