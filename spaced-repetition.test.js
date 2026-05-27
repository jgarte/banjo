import { test } from "node:test";
import assert from "node:assert/strict";
import * as fc from "fast-check";
import { createScheduler } from "./src/spaced-repetition.js";

test("property: next() always returns an in-range integer index", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 2, max: 20 }),
      fc.double({ min: 0, max: 0.999, noNaN: true }),
      fc.integer({ min: -1, max: 19 }),
      (noteCount, rand, current) => {
        const currentIndex = current < noteCount ? current : -1;
        const scheduler = createScheduler(noteCount, { random: () => rand });
        const idx = scheduler.next(currentIndex);
        return Number.isInteger(idx) && idx >= 0 && idx < noteCount;
      },
    ),
  );
});

test("property: never reselects the current note", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 2, max: 20 }),
      fc.double({ min: 0, max: 0.999, noNaN: true }),
      (noteCount, rand) => {
        const scheduler = createScheduler(noteCount, { random: () => rand });
        for (let current = 0; current < noteCount; current++) {
          if (scheduler.next(current) === current) return false;
        }
        return true;
      },
    ),
  );
});

test("with random()=0 returns the first eligible note", () => {
  const scheduler = createScheduler(4, { random: () => 0 });
  assert.equal(scheduler.next(-1), 0);
});

test("skips the current note's index", () => {
  const scheduler = createScheduler(4, { random: () => 0 });
  assert.equal(scheduler.next(0), 1);
});
