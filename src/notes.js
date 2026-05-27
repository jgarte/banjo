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

// The natural notes reachable in open position (frets 0-5) on a tenor
// banjo in C-G-D-A tuning. Shared by the trainer (script.js) and the
// fretboard renderer (draw.js) so the tuning lives in one place.
export const notes = [
  { string: 4, fret: 0, note: "C" },
  { string: 4, fret: 2, note: "D" },
  { string: 4, fret: 4, note: "E" },
  { string: 4, fret: 5, note: "F" },

  { string: 3, fret: 0, note: "G" },
  { string: 3, fret: 2, note: "A" },
  { string: 3, fret: 4, note: "B" },
  { string: 3, fret: 5, note: "C" },

  { string: 2, fret: 0, note: "D" },
  { string: 2, fret: 2, note: "E" },
  { string: 2, fret: 3, note: "F" },
  { string: 2, fret: 5, note: "G" },

  { string: 1, fret: 0, note: "A" },
  { string: 1, fret: 2, note: "B" },
  { string: 1, fret: 3, note: "C" },
  { string: 1, fret: 5, note: "D" },
];
