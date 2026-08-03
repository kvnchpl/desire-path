import { renderEncounter } from "./encounter.js";
import { createEncounterMap } from "./map.js";
import { visibleNeighborhood } from "./navigation.js";

const PUBLIC_SCHEMA_VERSION = 5;

const elements = {
  aboutClose: document.querySelector("#about-close"),
  aboutPanel: document.querySelector("#about-panel"),
  aboutToggle: document.querySelector("#about-toggle"),
  form: document.querySelector("#explore-form"),
  loadError: document.querySelector("#load-error"),
  loadErrorMessage: document.querySelector("#load-error-message"),
  loadErrorRetry: document.querySelector("#load-error-retry"),
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

elements.loadErrorRetry.addEventListener("click", () => window.location.reload());

function openAbout() {
  elements.aboutPanel.show();
  elements.aboutToggle.setAttribute("aria-expanded", "true");
  elements.aboutClose.focus();
}

elements.aboutToggle.addEventListener("click", () => {
  if (elements.aboutPanel.open) {
    elements.aboutPanel.close();
    return;
  }
  openAbout();
});

elements.aboutClose.addEventListener("click", () => {
  elements.aboutPanel.close();
});

elements.aboutPanel.addEventListener("close", () => {
  elements.aboutToggle.setAttribute("aria-expanded", "false");
  elements.aboutToggle.focus();
});

elements.aboutPanel.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  elements.aboutPanel.close();
});

async function loadJson(path) {
  let response;
  try {
    response = await fetch(path);
  } catch (error) {
    throw new Error(`Could not reach ${path}`, { cause: error });
  }
  if (!response.ok) throw new Error(`Could not load ${path}: HTTP ${response.status}`);
  try {
    return await response.json();
  } catch (error) {
    throw new Error(`Could not parse ${path}`, { cause: error });
  }
}

function validatePublicData(encounters, navigation, settings) {
  const versions = [encounters.schema_version, navigation.schema_version, settings.schema_version];
  if (versions.some((version) => version !== PUBLIC_SCHEMA_VERSION)) {
    const error = new Error(`Expected public schema ${PUBLIC_SCHEMA_VERSION}; received ${versions.join(", ")}`);
    error.publicMessage = "The published landscape is incompatible with this version of the interface.";
    throw error;
  }
  if (!Array.isArray(encounters.encounters) || !navigation.combinations || !settings.initial_encounter) {
    const error = new Error("Public data is missing required fields");
    error.publicMessage = "The published landscape is incomplete.";
    throw error;
  }
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
  const [encounters, navigation, settings] = await Promise.all([
    loadJson("data/encounters.json"),
    loadJson("data/navigation.json"),
    loadJson("data/settings.json"),
  ]);
  validatePublicData(encounters, navigation, settings);
  const encounterById = new Map(encounters.encounters.map((encounter) => [encounter.id, encounter]));
  const history = [settings.initial_encounter];
  let currentId = settings.initial_encounter;
  const map = createEncounterMap(elements.map, settings, navigate, (message) => {
    elements.status.textContent = message;
  });

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
    const neighbors = visibleNeighborhood(navigation, currentId, dimensions);
    renderEncounter(current, elements);
    renderEncounterDetails(current);
    map.render(current, neighbors, encounterById, {
      allPaths: navigation.possible_paths,
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
  elements.map.querySelector(".map-fallback")?.remove();
  elements.loadErrorMessage.textContent = error.publicMessage || "Its public data is currently unavailable.";
  elements.loadError.hidden = false;
  elements.loadErrorRetry.focus();
});
