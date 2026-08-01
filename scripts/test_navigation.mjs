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
assert.match(interfaceHtml, /<details class="debug">/);
assert.match(interfaceHtml, /<details class="explore" open>/);
assert.match(interfaceHtml, /id="debug-show-all"/);
assert.match(interfaceHtml, /id="debug-show-ids"/);
assert.match(interfaceHtml, /id="debug-show-distances"/);
assert.match(interfaceHtml, /id="debug-show-data"/);
assert.match(interfaceHtml, /id="debug-data" hidden/);

const encounters = JSON.parse(await readFile(new URL("../data/encounters.geojson", import.meta.url), "utf8"));
const generatedDistances = JSON.parse(await readFile(new URL("../data/distances.json", import.meta.url), "utf8"));
const generatedSettings = JSON.parse(await readFile(new URL("../data/settings.json", import.meta.url), "utf8"));
const affectDistances = JSON.parse(await readFile(new URL("../data/affect-distances.json", import.meta.url), "utf8"));
const encounterIds = encounters.features.map(({ properties }) => properties.id);
assert.equal(encounterIds.length, 15);
assert.equal(generatedDistances.pairs.length, 105);
assert.equal(generatedDistances.schema_version, 2);
assert.equal(generatedSettings.schema_version, 2);
assert.equal(affectDistances.schema_version, 2);
const firstGeneratedPair = generatedDistances.pairs.find(({ a, b }) => a === "E001" && b === "E002");
assert.equal(firstGeneratedPair.time, 0.166667);
assert.equal(firstGeneratedPair.feeling, 0.45);
assert.equal(firstGeneratedPair.knowing, 1);

const encounterProperties = encounters.features.map(({ properties }) => properties);
const valuesFor = (field) => [...new Set(encounterProperties.map((properties) => properties[field]).filter(Boolean))].sort();

assert.deepEqual(valuesFor("tm_position"), [
  "ATEMPORAL", "DISTANT_FUTURE", "DISTANT_PAST", "INDETERMINATE", "NEAR_FUTURE", "PRESENT", "RECENT_PAST",
]);
assert.deepEqual(valuesFor("af_primary"), [
  "AMBIVALENCE", "ANGER", "ANXIETY", "DESIRE", "EERINESS", "ESTRANGEMENT", "FEAR", "GRIEF", "JOY",
  "LONELINESS", "MELANCHOLY", "NOSTALGIA", "SERENITY", "TENDERNESS", "WONDER",
]);
assert.deepEqual(valuesFor("kn_primary"), [
  "ANTICIPATED", "DOCUMENTED", "DREAMED", "GENERATED", "IMAGINED", "INFERRED", "INHERITED", "REMEMBERED",
  "UNRESOLVED", "WITNESSED",
]);
const removedFields = [
  "sp_geometry", "sp_status", "tm_extent", "tm_form_primary", "tm_form_secondary",
  "af_intensity", "af_secondary", "kn_secondary",
];
encounterProperties.forEach((properties) => removedFields.forEach((field) => assert.ok(!(field in properties))));
assert.equal(affectDistances.placeholder, true);
assert.equal(affectDistances.identical, 0);
assert.equal(affectDistances.pairs.length, 136);
const mediaTypes = [...new Set(encounterProperties.flatMap(({ media }) => media.map(({ type }) => type)))].sort();
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
