import { renderEncounter } from "./encounter.js";
import { createEncounterMap } from "./map.js";
import { visibleNeighborhood } from "./navigation.js";

const elements = {
  aboutClose: document.querySelector("#about-close"),
  aboutPanel: document.querySelector("#about-panel"),
  aboutToggle: document.querySelector("#about-toggle"),
  form: document.querySelector("#explore-form"),
  interfaceScroll: document.querySelector(".interface-scroll"),
  optionsShowAll: document.querySelector("#options-show-all"),
  optionsShowAllPaths: document.querySelector("#options-show-all-paths"),
  optionsShowIds: document.querySelector("#options-show-ids"),
  optionsShowDetails: document.querySelector("#options-show-details"),
  optionsData: document.querySelector("#options-data"),
  map: document.querySelector("#map"),
  media: document.querySelector("#encounter-media"),
  retrace: document.querySelector("#retrace"),
  status: document.querySelector("#status"),
  title: document.querySelector("#encounter-title"),
};

function setAboutOpen(isOpen) {
  elements.aboutPanel.hidden = !isOpen;
  elements.interfaceScroll.inert = isOpen;
  elements.aboutToggle.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) {
    elements.aboutClose.focus();
  } else {
    elements.aboutToggle.focus();
  }
}

elements.aboutToggle.addEventListener("click", () => {
  setAboutOpen(elements.aboutPanel.hidden);
});

elements.aboutClose.addEventListener("click", () => {
  setAboutOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.aboutPanel.hidden) setAboutOpen(false);
});

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
  const history = [settings.initial_encounter];
  let currentId = settings.initial_encounter;
  const map = createEncounterMap(elements.map, settings, navigate);

  function renderEncounterDetails(current) {
    elements.optionsData.hidden = !elements.optionsShowDetails.checked;
    if (!elements.optionsShowDetails.checked) {
      elements.optionsData.replaceChildren();
      return;
    }

    const table = document.createElement("table");
    const body = table.createTBody();
    const rows = [
      ["title", current.title.toUpperCase()],
      ["id", current.id],
      ["place", readablePlace(current.place)],
      ["time", readableCategory(current.time)],
      ["feeling", readableCategory(current.feeling)],
      ["knowing", readableCategory(current.knowing)],
    ];
    rows.forEach(([label, value]) => {
      const row = body.insertRow();
      const heading = document.createElement("th");
      heading.scope = "row";
      heading.textContent = label;
      row.append(heading);
      row.insertCell().textContent = value;
    });
    elements.optionsData.replaceChildren(table);
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
      allPairs: distances.pairs,
      dimensions,
      showAllNodes: elements.optionsShowAll.checked,
      showAllPaths: elements.optionsShowAllPaths.checked,
      showNodeIds: elements.optionsShowIds.checked,
    });
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

  elements.optionsShowAll.addEventListener("change", () => {
    render(elements.optionsShowAll.checked ? "Every encounter position is visible." : "Only nearby encounter positions are visible.");
  });

  elements.optionsShowAllPaths.addEventListener("change", () => {
    render(elements.optionsShowAllPaths.checked ? "Every path is visible." : "Only nearby paths are visible.");
  });

  elements.optionsShowIds.addEventListener("change", () => {
    render(elements.optionsShowIds.checked ? "Encounter IDs are visible." : "Encounter IDs are hidden.");
  });

  elements.optionsShowDetails.addEventListener("change", () => {
    render(elements.optionsShowDetails.checked ? "Current encounter details are visible." : "Current encounter details are hidden.");
  });

  render();
}

start().catch((error) => {
  console.error(error);
  elements.status.textContent = "The landscape could not be opened.";
  elements.map.querySelector(".map-fallback")?.replaceChildren("The landscape could not be opened.");
});
