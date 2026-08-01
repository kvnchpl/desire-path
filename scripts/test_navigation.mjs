import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { compositeDistance, visibleNeighborhood } from "../js/navigation.js";

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

const interfaceHtml = await readFile(new URL("../index.html", import.meta.url), "utf8");
assert.match(interfaceHtml, /value="place">/);
for (const dimension of ["time", "feeling", "knowing"]) {
  assert.match(interfaceHtml, new RegExp(`value="${dimension}" checked`));
}
assert.match(interfaceHtml, /<details class="settings">/);
assert.match(interfaceHtml, /<details class="explore" open>/);
assert.match(interfaceHtml, /id="settings-show-all"/);
assert.match(interfaceHtml, /id="settings-show-ids"/);
assert.match(interfaceHtml, /id="settings-show-distances"/);
assert.match(interfaceHtml, /id="settings-show-details"/);
assert.match(interfaceHtml, /id="settings-data" hidden/);

const encounters = JSON.parse(await readFile(new URL("../data/encounters.json", import.meta.url), "utf8"));
const generatedDistances = JSON.parse(await readFile(new URL("../data/distances.json", import.meta.url), "utf8"));
const generatedSettings = JSON.parse(await readFile(new URL("../data/settings.json", import.meta.url), "utf8"));
const feelingDistances = JSON.parse(await readFile(new URL("../data/feeling-distances.json", import.meta.url), "utf8"));
const knowingDistances = JSON.parse(await readFile(new URL("../data/knowing-distances.json", import.meta.url), "utf8"));
const encounterIds = encounters.encounters.map(({ id }) => id);
assert.equal(encounterIds.length, 15);
assert.equal(generatedDistances.pairs.length, 105);
assert.equal(generatedDistances.schema_version, 3);
assert.equal(generatedSettings.schema_version, 3);
assert.equal(feelingDistances.schema_version, 3);
assert.equal(knowingDistances.schema_version, 3);
const firstGeneratedPair = generatedDistances.pairs.find(({ a, b }) => a === "E001" && b === "E002");
assert.equal(firstGeneratedPair.time, 0.166667);
assert.equal(firstGeneratedPair.feeling, 0.45);
assert.equal(firstGeneratedPair.knowing, 0.8);

const encounterRecords = encounters.encounters;
const valuesFor = (field) => [...new Set(encounterRecords.map((encounter) => encounter[field]).filter(Boolean))].sort();

assert.deepEqual(valuesFor("time"), [
  "ATEMPORAL", "DISTANT_FUTURE", "DISTANT_PAST", "INDETERMINATE", "NEAR_FUTURE", "PRESENT", "RECENT_PAST",
]);
assert.deepEqual(valuesFor("feeling"), [
  "AMBIVALENCE", "ANGER", "ANXIETY", "DESIRE", "EERINESS", "ESTRANGEMENT", "FEAR", "GRIEF", "JOY",
  "LONELINESS", "MELANCHOLY", "NOSTALGIA", "SERENITY", "TENDERNESS", "WONDER",
]);
assert.deepEqual(valuesFor("knowing"), [
  "ANTICIPATED", "DOCUMENTED", "DREAMED", "GENERATED", "IMAGINED", "INFERRED", "INHERITED", "REMEMBERED",
  "UNRESOLVED", "WITNESSED",
]);
const removedFields = [
  "sp_geometry", "sp_status", "tm_extent", "tm_form_primary", "tm_form_secondary",
  "af_intensity", "af_secondary", "kn_secondary", "tm_position", "af_primary", "kn_primary",
];
encounterRecords.forEach((encounter) => removedFields.forEach((field) => assert.ok(!(field in encounter))));
encounterRecords.forEach(({ place }) => assert.ok(Array.isArray(place) && place.length === 2));
assert.equal(feelingDistances.placeholder, true);
assert.equal(feelingDistances.identical, 0);
assert.equal(feelingDistances.pairs.length, 136);
const feelingDistance = new Map(feelingDistances.pairs.map(({ a, b, distance }) => [[a, b].sort().join("|"), distance]));
assert.equal(feelingDistance.get("ANXIETY|FEAR"), 0.1);
assert.equal(feelingDistance.get("JOY|WONDER"), 0.15);
assert.equal(feelingDistance.get("GRIEF|MELANCHOLY"), 0.2);
assert.equal(feelingDistance.get("EERINESS|ESTRANGEMENT"), 0.2);
assert.equal(feelingDistance.get("FEAR|JOY"), 1);
assert.equal(knowingDistances.placeholder, true);
assert.equal(knowingDistances.identical, 0);
assert.equal(knowingDistances.pairs.length, 45);
const knowingDistance = new Map(knowingDistances.pairs.map(({ a, b, distance }) => [[a, b].sort().join("|"), distance]));
assert.equal(knowingDistance.get("REMEMBERED|WITNESSED"), 0.2);
assert.equal(knowingDistance.get("DOCUMENTED|INFERRED"), 0.25);
assert.equal(knowingDistance.get("DREAMED|IMAGINED"), 0.2);
assert.equal(knowingDistance.get("ANTICIPATED|IMAGINED"), 0.3);
assert.equal(knowingDistance.get("IMAGINED|WITNESSED"), 0.8);
const mediaTypes = [...new Set(encounterRecords.flatMap(({ media }) => media.map(({ type }) => type)))].sort();
assert.deepEqual(mediaTypes, ["audio", "image", "text", "video"]);

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
    assert.ok(neighborhood.length >= 3 && neighborhood.length <= 6);
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
