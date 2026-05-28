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

import { drawFretboard, NOTE_RADIUS } from "./draw.js";
import { notes } from "./notes.js";
import type { Note } from "./notes.js";

let currentNote: Note | null = null;
let showingAnswer = false;

// DOM access: getElementById fetches the <canvas> element, and getContext("2d")
// returns its CanvasRenderingContext2D — the handle used for all drawing (see
// draw.ts).
// https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementById
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
const canvas = document.getElementById("fretboard") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

function nextNote(): void {
  currentNote = notes[Math.floor(Math.random() * notes.length)];
  showingAnswer = false;
  drawFretboard(ctx, canvas, currentNote, showingAnswer);
}

function showNote(): void {
  if (!currentNote) return;

  showingAnswer = true;
  drawFretboard(ctx, canvas, currentNote, showingAnswer);
}

type Position = {
  x: number;
  y: number;
};

// Calculate note position on canvas
function getNotePosition(note: Note): Position {
  const padding = 40;
  const numStrings = 4;
  const numFrets = 5;
  const stringSpacing = (canvas.width - 2 * padding) / (numStrings - 1);
  const fretSpacing = (canvas.height - 2 * padding) / numFrets;

  const stringIndex = numStrings - note.string;
  const fretIndex = note.fret;

  const x = padding + stringIndex * stringSpacing;
  let y: number;

  if (fretIndex === 0) {
    y = padding - 15;
  } else {
    y = padding + fretIndex * fretSpacing - fretSpacing / 2;
  }

  return { x, y };
}

// Handle canvas click/touch
function handleCanvasClick(clientX: number, clientY: number): void {
  if (!currentNote) return;

  // getBoundingClientRect gives the canvas's size/position in CSS pixels; we
  // scale the event's viewport coordinates into the canvas's internal pixel
  // grid (which can differ from its displayed size).
  // https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clickX = (clientX - rect.left) * scaleX;
  const clickY = (clientY - rect.top) * scaleY;

  const notePos = getNotePosition(currentNote);
  const distance = Math.sqrt(
    Math.pow(clickX - notePos.x, 2) + Math.pow(clickY - notePos.y, 2),
  );

  if (distance < NOTE_RADIUS * 1.5) {
    showNote();
  } else {
    nextNote();
  }
}

// Input via the DOM events API (addEventListener).
// https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
// https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent
canvas.addEventListener("click", (e: MouseEvent) => {
  handleCanvasClick(e.clientX, e.clientY);
});

nextNote();
