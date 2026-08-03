import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { compositeDistance, traversablePaths, visibleNeighborhood } from "../js/navigation.js";
import { activePathColor, dimensionalPathColor } from "../js/map.js";

globalThis.L = {};

const pairs = [
  { a: "A", b: "B", place: 0.1, time: 0.9, feeling: 0.2, knowing: 0.8 },
  { a: "A", b: "C", place: 0.2, time: 0.8, feeling: 0.3, knowing: 0.7 },
  { a: "A", b: "D", place: 0.9, time: 0.1, feeling: 0.8, knowing: 0.2 },
  { a: "B", b: "C", place: 0.1, time: 0.7, feeling: 0.2, knowing: 0.6 },
  { a: "B", b: "D", place: 0.8, time: 0.2, feeling: 0.7, knowing: 0.3 },
  { a: "C", b: "D", place: 0.7, time: 0.3, feeling: 0.6, knowing: 0.4 },
];
const settings = { visibility_percentile: 20, minimum_neighbors: 3, maximum_neighbors: 6 };

assert.equal(compositeDistance(pairs[0], ["place", "time"]), 0.5);
const placeNeighbors = visibleNeighborhood({ currentId: "A", encounterIds: ["A", "B", "C", "D"], pairs, dimensions: ["place"], settings });
assert.deepEqual(placeNeighbors.map(({ id }) => id).sort(), ["B", "C", "D"]);
assert.throws(() => visibleNeighborhood({ currentId: "A", encounterIds: ["A"], pairs: [], dimensions: [], settings }));
assert.equal(activePathColor(["place"]), "#b8bbb5");
assert.equal(activePathColor(["time"]), "#a9544f");
assert.equal(activePathColor(["feeling"]), "#c4a447");
assert.equal(activePathColor(["knowing"]), "#536f8f");
assert.equal(activePathColor(["place", "time", "feeling"]), "#b66f3d");
assert.equal(activePathColor(["time", "knowing"]), "#785f79");
assert.equal(activePathColor(["feeling", "knowing"]), "#697c5a");
assert.equal(activePathColor(["time", "feeling", "knowing"]), "#4f514e");
assert.equal(activePathColor(["place", "time", "feeling", "knowing"]), "#252724");
const colorPairs = [
  { place: 0.1, time: 0.9, feeling: 0.9, knowing: 0.9 },
  { place: 0.9, time: 0.1, feeling: 0.1, knowing: 0.9 },
  { place: 0.9, time: 0.9, feeling: 0.9, knowing: 0.1 },
];
assert.equal(dimensionalPathColor(colorPairs[0], colorPairs, 1), "#b8bbb5");
assert.equal(dimensionalPathColor(colorPairs[1], colorPairs, 1), "#b66f3d");

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
const generatedDistances = JSON.parse(await readFile(new URL("../data/distances.json", import.meta.url), "utf8"));
const generatedSettings = JSON.parse(await readFile(new URL("../data/settings.json", import.meta.url), "utf8"));
const feelingDistances = JSON.parse(await readFile(new URL("../data/feeling-distances.json", import.meta.url), "utf8"));
const knowingDistances = JSON.parse(await readFile(new URL("../data/knowing-distances.json", import.meta.url), "utf8"));
const encounterIds = encounters.encounters.map(({ id }) => id);
assert.ok(encounterIds.length >= 1);
const possiblePaths = traversablePaths({ encounterIds, pairs: generatedDistances.pairs, settings: generatedSettings });
assert.ok(possiblePaths.length > 0);
assert.ok(possiblePaths.length < generatedDistances.pairs.length);
assert.ok(possiblePaths.every(({ aToB, bToA }) => aToB || bToA));
assert.ok(possiblePaths.some(({ aToB, bToA }) => aToB !== bToA));
assert.ok(possiblePaths.some(({ aToB, bToA }) => aToB && bToA));
assert.equal(generatedDistances.pairs.length, encounterIds.length * (encounterIds.length - 1) / 2);
assert.equal(generatedDistances.schema_version, 4);
assert.equal(generatedSettings.schema_version, 4);
assert.equal(feelingDistances.schema_version, 4);
assert.equal(knowingDistances.schema_version, 4);
const firstGeneratedPair = generatedDistances.pairs.find(({ a, b }) => a === "E001" && b === "E002");

const encounterRecords = encounters.encounters;
const valuesFor = (field) => [...new Set(encounterRecords.map((encounter) => encounter[field]).filter(Boolean))].sort();

if (encounterIds.length === 15 && encounterRecords.every(({ placeholder }) => placeholder)) {
  assert.equal(encounterIds.length, 15);
  assert.equal(firstGeneratedPair.time, 0.166667);
  assert.equal(firstGeneratedPair.feeling, 0.15);
  assert.equal(firstGeneratedPair.knowing, 0.8);
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
    const neighborhood = visibleNeighborhood({
      currentId,
      encounterIds,
      pairs: generatedDistances.pairs,
      dimensions: selected,
      settings: generatedSettings,
    });
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
