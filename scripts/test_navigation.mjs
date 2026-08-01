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
assert.match(interfaceHtml, /id="debug-show-all"/);
assert.match(interfaceHtml, /id="debug-show-ids"/);

console.log("DESIRE PATH navigation is valid.");
