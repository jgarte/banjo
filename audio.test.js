import { test } from "node:test";
import assert from "node:assert/strict";
import { getNoteFrequency } from "./src/audio.js";

test("open strings ring at their C-G-D-A pitches", () => {
  assert.equal(getNoteFrequency({ string: 4, fret: 0 }), 130.81); // C3
  assert.equal(getNoteFrequency({ string: 3, fret: 0 }), 196.0); // G3
  assert.equal(getNoteFrequency({ string: 2, fret: 0 }), 293.66); // D4
  assert.equal(getNoteFrequency({ string: 1, fret: 0 }), 440.0); // A4
});

test("each fret raises the pitch by one semitone", () => {
  const open = getNoteFrequency({ string: 1, fret: 0 });
  const oneFret = getNoteFrequency({ string: 1, fret: 1 });
  assert.ok(Math.abs(oneFret / open - Math.pow(2, 1 / 12)) < 1e-9);
});

test("twelve frets double the frequency (one octave)", () => {
  const open = getNoteFrequency({ string: 4, fret: 0 });
  const octave = getNoteFrequency({ string: 4, fret: 12 });
  assert.ok(Math.abs(octave - open * 2) < 1e-9);
});
