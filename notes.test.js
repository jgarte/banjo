import { test } from "node:test";
import assert from "node:assert/strict";
import { notes } from "./src/notes.js";

const CHROMATIC = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

// Open-string pitch classes for C-G-D-A tuning, by string number.
const OPEN = { 4: "C", 3: "G", 2: "D", 1: "A" };

test("every note name matches its pitch on the C-G-D-A fretboard", () => {
  for (const { string, fret, note } of notes) {
    const open = CHROMATIC.indexOf(OPEN[string]);
    const expected = CHROMATIC[(open + fret) % 12];
    assert.equal(note, expected, `string ${string} fret ${fret}`);
  }
});

test("includes only natural notes (no sharps)", () => {
  for (const { note } of notes) {
    assert.ok(!note.includes("#"), `${note} should be natural`);
  }
});

test("covers exactly the natural notes in frets 0-5", () => {
  let expected = 0;
  for (const string of [4, 3, 2, 1]) {
    const open = CHROMATIC.indexOf(OPEN[string]);
    for (let fret = 0; fret <= 5; fret++) {
      if (!CHROMATIC[(open + fret) % 12].includes("#")) expected++;
    }
  }
  assert.equal(notes.length, expected);
});
