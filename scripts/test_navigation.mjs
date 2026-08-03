import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { combinationKey, visibleNeighborhood } from "../js/navigation.js";
import { activePathColor, dimensionalPathColor } from "../js/map.js";

globalThis.L = {};

const lookupFixture = {
  combinations: {
    "place+time": { neighborhoods: { A: [{ id: "B", distance: 0.5, bridge: false }] } },
  },
};
assert.equal(combinationKey(["time", "place"]), "place+time");
assert.deepEqual(visibleNeighborhood(lookupFixture, "A", ["time", "place"]), [{ id: "B", distance: 0.5, bridge: false }]);
assert.throws(() => visibleNeighborhood(lookupFixture, "A", []));
assert.equal(activePathColor(["place"]), "#b8bbb5");
assert.equal(activePathColor(["time"]), "#a9544f");
assert.equal(activePathColor(["feeling"]), "#c4a447");
assert.equal(activePathColor(["knowing"]), "#536f8f");
assert.equal(activePathColor(["place", "time", "feeling"]), "#b66f3d");
assert.equal(activePathColor(["time", "knowing"]), "#785f79");
assert.equal(activePathColor(["feeling", "knowing"]), "#697c5a");
assert.equal(activePathColor(["time", "feeling", "knowing"]), "#4f514e");
assert.equal(activePathColor(["place", "time", "feeling", "knowing"]), "#252724");
assert.equal(dimensionalPathColor(["place"]), "#b8bbb5");
assert.equal(dimensionalPathColor(["time", "feeling"]), "#b66f3d");

const interfaceHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");
assert.match(interfaceHtml, /value="place">/);
for (const dimension of ["time", "feeling", "knowing"]) {
  assert.match(interfaceHtml, new RegExp(`value="${dimension}" checked`));
}
assert.match(interfaceHtml, /<details class="options">/);
assert.match(interfaceHtml, /<details class="explore" open>/);
assert.match(interfaceHtml, /id="options-show-all"/);
assert.match(interfaceHtml, /id="options-show-all-paths"/);
assert.match(interfaceHtml, /id="options-show-ids"/);
assert.match(interfaceHtml, /id="options-show-details"/);
assert.match(interfaceHtml, /id="options-data" hidden/);
assert.match(interfaceHtml, /<footer class="interface-footer">/);
assert.doesNotMatch(interfaceHtml, /compare distances/);

const encounters = JSON.parse(await readFile(new URL("../data/encounters.json", import.meta.url), "utf8"));
const generatedNavigation = JSON.parse(await readFile(new URL("../data/navigation.json", import.meta.url), "utf8"));
const generatedSettings = JSON.parse(await readFile(new URL("../data/settings.json", import.meta.url), "utf8"));
const feelingDistances = JSON.parse(await readFile(new URL("../data/feeling-distances.json", import.meta.url), "utf8"));
const knowingDistances = JSON.parse(await readFile(new URL("../data/knowing-distances.json", import.meta.url), "utf8"));
const encounterIds = encounters.encounters.map(({ id }) => id);
assert.ok(encounterIds.length >= 1);
const possiblePaths = generatedNavigation.possible_paths;
assert.ok(possiblePaths.length > 0);
assert.ok(possiblePaths.every(({ a_to_b, b_to_a }) => a_to_b || b_to_a));
assert.ok(possiblePaths.some(({ a_to_b, b_to_a }) => a_to_b !== b_to_a));
assert.ok(possiblePaths.some(({ a_to_b, b_to_a }) => a_to_b && b_to_a));
assert.equal(generatedNavigation.schema_version, 5);
assert.equal(generatedSettings.schema_version, 5);
assert.equal(feelingDistances.schema_version, 5);
assert.equal(knowingDistances.schema_version, 5);

const encounterRecords = encounters.encounters;
const valuesFor = (field) => [...new Set(encounterRecords.map((encounter) => encounter[field]).filter(Boolean))].sort();

if (encounterIds.length === 15 && encounterRecords.every(({ placeholder }) => placeholder)) {
  assert.equal(encounterIds.length, 15);
  assert.deepEqual(valuesFor("time"), [
    "ATEMPORAL", "DISTANT_FUTURE", "DISTANT_PAST", "INDETERMINATE", "NEAR_FUTURE", "PRESENT", "RECENT_PAST",
  ]);
  assert.deepEqual(valuesFor("feeling"), [
    "ANGER", "DESIRE", "FEAR", "GRIEF", "JOY", "NOSTALGIA", "WONDER",
  ]);
  assert.deepEqual(valuesFor("knowing"), [
    "DOCUMENTED", "DREAMED", "IMAGINED", "INHERITED", "REMEMBERED", "UNRESOLVED", "WITNESSED",
  ]);
  assert.deepEqual(
    [...new Set(encounterRecords.flatMap(({ media }) => media.map(({ type }) => type)))].sort(),
    ["audio", "image", "text", "video"],
  );
}
const removedFields = [
  "sp_geometry", "sp_status", "tm_extent", "tm_form_primary", "tm_form_secondary",
  "af_intensity", "af_secondary", "kn_secondary", "tm_position", "af_primary", "kn_primary",
];
encounterRecords.forEach((encounter) => removedFields.forEach((field) => assert.ok(!(field in encounter))));
encounterRecords.forEach(({ place }) => assert.ok(Array.isArray(place) && place.length === 2));
assert.equal(feelingDistances.placeholder, true);
assert.equal(feelingDistances.identical, 0);
assert.equal(feelingDistances.pairs.length, 21);
const feelingDistance = new Map(feelingDistances.pairs.map(({ a, b, distance }) => [[a, b].sort().join("|"), distance]));
assert.equal(feelingDistance.get("JOY|WONDER"), 0.15);
assert.equal(feelingDistance.get("FEAR|JOY"), 1);
assert.equal(knowingDistances.placeholder, true);
assert.equal(knowingDistances.identical, 0);
assert.equal(knowingDistances.pairs.length, 21);
const knowingDistance = new Map(knowingDistances.pairs.map(({ a, b, distance }) => [[a, b].sort().join("|"), distance]));
assert.equal(knowingDistance.get("REMEMBERED|WITNESSED"), 0.2);
assert.equal(knowingDistance.get("DREAMED|IMAGINED"), 0.2);
assert.equal(knowingDistance.get("IMAGINED|WITNESSED"), 0.8);
assert.ok(encounterRecords.every(({ media }) => Array.isArray(media) && media.length > 0));
const mediaTypes = [...new Set(encounterRecords.flatMap(({ media }) => media.map(({ type }) => type)))].sort();
assert.ok(mediaTypes.every((type) => ["audio", "image", "text", "video"].includes(type)));

const dimensions = ["place", "time", "feeling", "knowing"];
for (let mask = 1; mask < 2 ** dimensions.length; mask += 1) {
  const selected = dimensions.filter((_, index) => mask & (1 << index));
  const reachable = new Map(encounterIds.map((id) => [id, new Set()]));
  encounterIds.forEach((currentId) => {
    const neighborhood = visibleNeighborhood(generatedNavigation, currentId, selected);
    assert.ok(
      neighborhood.length >= generatedSettings.minimum_neighbors
      && neighborhood.length <= generatedSettings.maximum_neighbors,
    );
    neighborhood.forEach(({ id }) => {
      reachable.get(currentId).add(id);
      reachable.get(id).add(currentId);
    });
  });
  const visited = new Set([encounterIds[0]]);
  const queue = [encounterIds[0]];
  while (queue.length) {
    reachable.get(queue.shift()).forEach((id) => {
      if (!visited.has(id)) {
        visited.add(id);
        queue.push(id);
      }
    });
  }
  assert.equal(visited.size, encounterIds.length, `${selected.join("+")} must remain connected`);
}

console.log("DESIRE PATH navigation is valid.");
