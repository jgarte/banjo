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

import { drawFretboard } from "./draw.js";
import { notes } from "./notes.js";
import { getNoteFrequency, playNote } from "./audio.js";
import { createScheduler } from "./spaced-repetition.js";

/** @type {import('./notes.js').Note | null} */
let currentNote = null;
let showingAnswer = false;
let exploreMode = false; // Toggle to show all notes

// Double-tap/click detection
let lastTapTime = 0;
const DOUBLE_TAP_DELAY = 200; // milliseconds
/** @type {number | null} */
let singleTapTimeout = null;

// Spaced-repetition scheduler over the note set.
const scheduler = createScheduler(notes.length);

// DOM access: getElementById fetches the <canvas> element, and getContext("2d")
// returns its CanvasRenderingContext2D — the handle used for all drawing (see
// draw.js).
// https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementById
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
const canvas = /** @type {HTMLCanvasElement} */ (
  document.getElementById("fretboard")
);
const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext("2d"));

function nextQuestion() {
  const currentIndex = currentNote ? notes.indexOf(currentNote) : -1;
  currentNote = notes[scheduler.next(currentIndex)];
  showingAnswer = false;
  drawFretboard(ctx, canvas, currentNote, showingAnswer);
}

function showAnswer() {
  if (!currentNote) return;

  showingAnswer = true;
  drawFretboard(ctx, canvas, currentNote, showingAnswer);

  // Play the note
  playNote(getNoteFrequency(currentNote));
}

// Calculate note position on canvas
/** @param {import('./notes.js').Note} note */
function getNotePosition(note) {
  const padding = 40;
  const numStrings = 4;
  const numFrets = 5;
  const stringSpacing = (canvas.width - 2 * padding) / (numStrings - 1);
  const fretSpacing = (canvas.height - 2 * padding) / numFrets;

  const stringIndex = numStrings - note.string;
  const fretIndex = note.fret;

  const x = padding + stringIndex * stringSpacing;
  let y;

  if (fretIndex === 0) {
    y = padding - 15;
  } else {
    y = padding + fretIndex * fretSpacing - fretSpacing / 2;
  }

  return { x, y };
}

// Handle canvas click/touch
/**
 * @param {number} clientX
 * @param {number} clientY
 */
function handleCanvasClick(clientX, clientY) {
  const currentTime = Date.now();
  const timeSinceLastTap = currentTime - lastTapTime;

  // Check for double tap
  if (timeSinceLastTap < DOUBLE_TAP_DELAY) {
    // Clear any pending single-tap action. setTimeout/clearTimeout (the WHATWG
    // timer API) defer and cancel the single-tap handler below.
    // https://developer.mozilla.org/en-US/docs/Web/API/clearTimeout
    if (singleTapTimeout) {
      clearTimeout(singleTapTimeout);
      singleTapTimeout = null;
    }
    toggleExploreMode();
    lastTapTime = 0; // Reset to prevent triple-tap
    return;
  }

  lastTapTime = currentTime;

  // getBoundingClientRect gives the canvas's size/position in CSS pixels; we
  // scale the event's viewport coordinates into the canvas's internal pixel
  // grid (which can differ from its displayed size).
  // https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clickX = (clientX - rect.left) * scaleX;
  const clickY = (clientY - rect.top) * scaleY;

  if (exploreMode) {
    // In explore mode, check if any note was clicked (immediate, no delay)
    for (const note of notes) {
      const notePos = getNotePosition(note);
      const distance = Math.sqrt(
        Math.pow(clickX - notePos.x, 2) + Math.pow(clickY - notePos.y, 2),
      );

      if (distance < 20) {
        playNote(getNoteFrequency(note));
        return;
      }
    }
  } else {
    // Normal training mode - delay action to detect potential double-tap
    if (!currentNote) return;

    const notePos = getNotePosition(currentNote);
    const distance = Math.sqrt(
      Math.pow(clickX - notePos.x, 2) + Math.pow(clickY - notePos.y, 2),
    );

    // Delay the action with setTimeout to allow double-tap detection; the
    // returned id is cleared above if a second tap arrives in time.
    // https://developer.mozilla.org/en-US/docs/Web/API/setTimeout
    singleTapTimeout = setTimeout(() => {
      if (distance < 20) {
        showAnswer();
      } else {
        nextQuestion();
      }
      singleTapTimeout = null;
    }, DOUBLE_TAP_DELAY);
  }
}

function toggleExploreMode() {
  exploreMode = !exploreMode;
  if (exploreMode) {
    drawExploreMode();
  } else {
    // Return to training mode with the same note
    drawFretboard(ctx, canvas, currentNote, showingAnswer);
  }
}

function drawExploreMode() {
  drawFretboard(ctx, canvas, null, false, notes);
}

// Input via the DOM events API (addEventListener). A "click" MouseEvent carries
// clientX/clientY; a "touchend" TouchEvent carries them on changedTouches[0],
// and preventDefault stops the browser also synthesising a click.
// https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
// https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent
// https://developer.mozilla.org/en-US/docs/Web/API/TouchEvent
canvas.addEventListener("click", (e) => {
  handleCanvasClick(e.clientX, e.clientY);
});

canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  const touch = e.changedTouches[0];
  handleCanvasClick(touch.clientX, touch.clientY);
});

nextQuestion();
