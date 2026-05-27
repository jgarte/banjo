// banjo
// Copyright (C) 2026 jgart
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

// Weighted spaced-repetition scheduler over note indices. A note unseen for
// longer is more likely to be picked; the current note is never repeated.
// now() and random() are injectable for testing.
export function createScheduler(noteCount, options = {}) {
  const now = options.now ?? (() => Date.now());
  const random = options.random ?? Math.random;

  // When each note index was last shown, staggered so early picks vary.
  const lastShown = new Map();
  const start = now();
  for (let i = 0; i < noteCount; i++) {
    lastShown.set(i, start - i * 1000);
  }

  function next(currentIndex) {
    const t = now();

    // Weight by time since last shown (capped at 1), never the current note,
    // with a floor so every other note can still appear.
    const weights = [];
    for (let i = 0; i < noteCount; i++) {
      if (i === currentIndex) {
        weights.push(0);
        continue;
      }
      const weight = Math.min((t - lastShown.get(i)) / 10000, 1);
      weights.push(Math.max(weight, 0.1));
    }

    const total = weights.reduce((sum, w) => sum + w, 0);
    let r = random() * total;
    for (let i = 0; i < noteCount; i++) {
      r -= weights[i];
      if (r < 0) {
        lastShown.set(i, t);
        return i;
      }
    }

    return 0; // Fallback (only with degenerate inputs)
  }

  return { next };
}
