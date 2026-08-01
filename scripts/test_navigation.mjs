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

const encounters = JSON.parse(await readFile(new URL("../data/encounters.geojson", import.meta.url), "utf8"));
const generatedDistances = JSON.parse(await readFile(new URL("../data/distances.json", import.meta.url), "utf8"));
const generatedSettings = JSON.parse(await readFile(new URL("../data/settings.json", import.meta.url), "utf8"));
const encounterIds = encounters.features.map(({ properties }) => properties.id);
assert.equal(encounterIds.length, 15);
assert.equal(generatedDistances.pairs.length, 105);

const encounterProperties = encounters.features.map(({ properties }) => properties);
const valuesFor = (field) => [...new Set(encounterProperties.map((properties) => properties[field]).filter(Boolean))].sort();
const combinedValuesFor = (...fields) => [
  ...new Set(encounterProperties.flatMap((properties) => fields.map((field) => properties[field])).filter(Boolean)),
].sort();

assert.deepEqual(valuesFor("sp_geometry"), ["AREA", "MULTIPLE", "NONE", "POINT", "ROUTE"]);
assert.deepEqual(valuesFor("sp_status"), ["APPROXIMATE", "PRECISE", "RECONSTRUCTED", "UNLOCATABLE", "WITHHELD"]);
assert.deepEqual(valuesFor("tm_position"), [
  "ATEMPORAL", "DISTANT_FUTURE", "DISTANT_PAST", "INDETERMINATE", "NEAR_FUTURE", "PRESENT", "RECENT_PAST",
]);
assert.deepEqual(valuesFor("tm_extent"), ["DURATIONAL", "MOMENTARY", "ONGOING"]);
const temporalForms = ["ANACHRONIC", "COMPOSITE", "CYCLICAL", "LINEAR", "RECURSIVE"];
assert.deepEqual(valuesFor("tm_form_primary"), temporalForms);
assert.deepEqual(valuesFor("tm_form_secondary"), temporalForms);
assert.deepEqual(combinedValuesFor("af_primary", "af_secondary"), [
  "AMBIVALENCE", "ANGER", "ANXIETY", "DESIRE", "DISGUST", "EERINESS", "ESTRANGEMENT", "FEAR", "GRIEF",
  "JOY", "LONELINESS", "MELANCHOLY", "NOSTALGIA", "NUMBNESS", "SERENITY", "TENDERNESS", "WONDER",
]);
assert.deepEqual(combinedValuesFor("kn_primary", "kn_secondary"), [
  "ANTICIPATED", "DOCUMENTED", "DREAMED", "GENERATED", "IMAGINED", "INFERRED", "INHERITED", "REMEMBERED",
  "UNRESOLVED", "WITNESSED",
]);
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
